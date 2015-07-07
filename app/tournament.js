'use strict';

// Modules
var config = require('../config/config.json');
var assert = require('./lib/assert');
var logger = require('./lib/log')('tournament');
var util = require('./lib/util');
var DB = require('./lib/db');
var async = require('async');
var Spark = require('primus').Spark;
var Ring = require('./ring').Ring;
var User = require('./user').User;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;

var RING_HANDLER_PREFIX = '_ring';
var RING_EVENTS = ['stateChanged'];

var JP_HANDLER_PREFIX = '_jp';
var JP_EVENTS = ['openRing','rejectCJ', 'removeCJ', 'exited'];

var CJ_HANDLER_PREFIX = '_cj';
var CJ_EVENTS = ['joinRing', 'exited'];


/**
 * Tournament; the root of the application.
 * @param {String} id
 * @param {Primus} primus
 */
function Tournament(id, primus) {
	assert.string(id, 'id');
	assert.provided(primus, 'primus');
	
	this.id = id;
	this.primus = primus;
	
	this.rings = [];
	this.users = {};
	
	// Bind socket events
	primus.on('connection', this._onConnection.bind(this));
	primus.on('disconnection', this._onDisconnection.bind(this));
}

/**
 * Build and return an array of the rings' states.
 * @return {Array}
 */
Tournament.prototype._getRingStates = function () {
	return this.rings.reduce(function (arr, ring) {
		arr.push(ring.getState());
		return arr;
	}, []);
};

/**
 * Find a Jury President's ring.
 * Return `null` if the Jury President has not opened a ring yet.
 * @param {JuryPresident} jp
 * @return {Ring}
 */
Tournament.prototype._findJPRing = function (jp) {
	var r = null;
	this.rings.some(function (ring) {
		if (jp === ring.juryPresident) {
			r = ring;
			return true;
		}
	});
	return r;
};

/**
 * Find a Corner Judge's ring.
 * @param {CornerJudge} cj
 * @return {Ring}
 */
Tournament.prototype._findCJRing = function (cj) {
	var r = null;
	this.rings.some(function (ring) {
		if (ring.hasCJ(cj)) {
			r = ring;
			return true;
		}
	});
	return r;
};

/*
 * ==================================================
 * Connection & identification
 * ==================================================
 */

/**
 * New socket connection.
 * @param {Spark} spark
 */
Tournament.prototype._onConnection = function (spark) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
	assert.object(spark.query, 'spark.query');
	
	var identity = spark.query.identity;
	assert.string(identity, 'identity');
	
	// Check whether the user ID is passed as a query parameter and if it matches and existing user
	// In some situations, such as when the database is reset, an ID might not match any user
	var id = spark.query.id;
	if (!id || !this.users[id]) {
		// New user; request identification
		logger.debug("New user with identity=" + identity);
		this._identifyUser(spark);
		return;
	}
	
	// Existing user
	var user = this.users[id];
	logger.debug("Existing user with ID=" + id);

	// Check whether the user's previous spark is still open
	if (user.spark && user.spark.readyState === Spark.OPEN) {
		// Inform client that a session conflict has been detected
		logger.debug("> Session conflict detected");
		spark.emit('io.error', {
			message: "Session already open"
		});
		spark.end();
		return;
	}

	// Check whether user is switching role
	var isJP = identity === 'juryPresident';
	if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
		// Not switching; restore session
		logger.debug("> Identity confirmed: " + identity);
		this._restoreUserSession(user, spark);
	} else {
		// Switching; remove user from system and request identification from new user
		logger.debug("> User has changed identity. Starting new identification process...");
		DB.removeUser(user, function () {
			user.exit();
			delete this.users[id];
			this._identifyUser(spark);
		}.bind(this));
	}
};

/**
 * Socket disconnection.
 * @param {Spark} spark
 */
Tournament.prototype._onDisconnection = function (spark) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
	
	// Check whether the user ID is passed as a query parameter and if it matches and existing user
	// In some situations, such as when the database is reset, an ID might not match any user
	var id = spark.query.id;
	if (id && this.users[id]) {
		// Notify user of disconnection
		logger.debug("User with ID=" + id + " disconnected.");
		this.users[id].disconnected();
	}
};

/**
 * Request and wait for user identification.
 * @param {Spark} spark
 */
Tournament.prototype._identifyUser = function (spark) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');

	// Listen for identification
	spark.once('identification', this._onIdentification.bind(this, spark));

	// Inform user that we're waiting for an identification
	logger.debug("> Waiting for identification...");
	spark.emit('root.showView', { view: 'loginView' });
	spark.emit('login.focusField');
};

/**
 * A user is identifying itself.
 * @param {Spark} spark
 * @param {Object} data
 * 		  {String} data.identity - (juryPresident|cornerJudge)
 * 		  {String} data.value - JP password or CJ name
 */
Tournament.prototype._onIdentification = function (spark, data) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
	assert.object(data, 'data');
	assert.string(data.identity, 'data.identity');
	assert.ok(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			  "`data.identity` must be 'juryPresident' or 'cornerJudge'");

	// Check identification
	if (data.identity === 'juryPresident' && data.value !== process.env.MASTER_PWD ||
		data.identity === 'cornerJudge' && (typeof data.value !== 'string' || data.value.length === 0)) {
		logger.debug("> Failed identification (identity=" + data.identity + ")");

		// Shake field
		spark.emit('login.shakeResetField');

		// Update instruction text if appropriate
		if (data.identity === 'juryPresident') {
			spark.emit('login.setInstr', { text: "Master password incorrect" });
		}

		// Listen for identification again
		spark.once('identification', this._onIdentification.bind(this, spark));
		return;
	}

	// Successful identification; insert the new user in the database
	DB.insertUser(spark.query.id, this.id, data.identity, data.value, function (newDoc) {
		if (newDoc) {
			var user = this._initUser(spark, true, newDoc);
			logger.info('newUser', newDoc);
			
			// Notify client of success and send along ring states
			logger.debug("> Successful identification (identity=" + data.identity + ")");
			user.idSuccess(this._getRingStates());
		} else {
			// If database insertion failed, notify client that identification failed
			spark.emit('login.setInstr', { text: "Unexpected error" });
			
			// Listen for identification again
			spark.once('identification', this._onIdentification.bind(this, spark));
		}
	}.bind(this));
};


/*
 * ==================================================
 * Initialisation & restoration
 * ==================================================
 */

/**
 * Instanciate and initialise a new JuryPresident or CornerJudge object based on a database document.
 * @param {Spark} spark
 * @param {Boolean} connected
 * @param {Object} doc
 * @return {User}
 */
Tournament.prototype._initUser = function (spark, connected, doc) {
	assert.object(doc, 'doc');

	var user;
	switch(doc.identity) {
		case 'juryPresident':
			user = new JuryPresident(doc._id, spark, connected);
			util.addEventListeners(this, user, JP_EVENTS, JP_HANDLER_PREFIX);
			break;
		case 'cornerJudge':
			user = new CornerJudge(doc._id, spark, connected, doc.name, doc.authorised);
			util.addEventListeners(this, user, CJ_EVENTS, CJ_HANDLER_PREFIX);
			break;
	}
	
	this.users[user.id] = user;
	return user;
};

/**
 * Retore the tournament's users.
 * @param {Function} cb - a function called when the restoration is complete
 */
Tournament.prototype.restoreUsers = function (cb) {
	assert.function(cb, 'cb');

	DB.findUsers(this.id, function (docs) {
		docs.forEach(this._initUser.bind(this, null, false));
		logger.debug("> Users restored");
		cb();
	}.bind(this));
};

Tournament.prototype._restoreUserSession = function (user, spark) {
	assert.instanceOf(user, 'user', User, 'User');
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
	
	// Initialise the new spark
	user.initSpark(spark);
	
	// Restore Jury President
	var ring;
	if (user instanceof JuryPresident) {
		ring = this._findJPRing(user);
		if (!ring) {
			user.idSuccess(this._getRingStates());
		} else {
			user.ringOpened(ring, ring.matchConfig, ring.getSlots());
		}
	
	// Restore Corner Judge
	} else {
		ring = this._findCJRing(user);
		if (!ring) {
			user.idSuccess(this._getRingStates());
		} else {
			if (!user.authorised) {
				user.waitingForAuthorisation();
			} else {
				user.ringJoined(ring);
			}
		}
	}
	
	logger.debug("> Session restored");
};

/**
 * Instanciate and initialise a new Ring object based on a database document.
 * @param {Object} doc
 */
Tournament.prototype._initRing = function (doc) {
	assert.object(doc, 'doc');

	var ring = new Ring(doc._id, doc.index, doc.slotCount, doc.matchConfig);
	this.rings[doc.index] = ring;

	// Jury President
	if (doc.jpId) {
		var jp = this.users[doc.jpId];
		if (jp) {
			ring.initJP(jp);
		} else {
			logger.error("Jury President is not in the system", { id: doc.jpId });
		}
	}

	// Corner Judges
	if (doc.cjIds) {
		doc.cjIds.forEach(function (id) {
			var cj = this.users[id];
			if (cj) {
				ring.initCJ(cj);
			} else {
				logger.error("Corner Judge is not in the system", { id: id });
			}
		}, this);
	}

	// Add events listeners
	util.addEventListeners(this, ring, RING_EVENTS, RING_HANDLER_PREFIX);
};

/**
 * Initialise the tournament's rings.
 * @param {Number} count - the number of rings, as an integer greater than 0
 * @param {Function} cb - a function called when the initialisation is complete
 */
Tournament.prototype.createRings = function (count, cb) {
	assert.integerGt0(count, 'count');
	assert.function(cb, 'cb');

	// Retrieve the default match configuration
	var defaults = config.matchConfig.defaults;

	// Insert new rings in the database one at a time
	DB.insertRings(this.id, count, config.cornerJudgesPerRing, defaults, function (newDocs) {
		newDocs.forEach(this._initRing, this);
		logger.debug("Rings initialised");
		cb();
	}.bind(this));
};

/**
 * Restore the tournament's rings and their matches.
 * @param {Function} cb - a function called when the restoration is complete
 */
Tournament.prototype.restoreRings = function (cb) {
	assert.function(cb, 'cb');

	DB.findRings(this.id, function (docs) {
		docs.forEach(this._initRing, this);
		
		// Restore matches
		async.each(this.rings, function (ring, next) {
			ring.restoreMatch(next);
		}, function () {
			logger.debug("> Rings restored");
			cb();
		});
	}.bind(this));
};


/*
 * ==================================================
 * Ring events
 * ==================================================
 */

/**
 * Notify users that the state of a ring has changed.
 */
Tournament.prototype._ringStateChanged = function () {
	assert.object(this.users, 'users');

	var ringStates = this._getRingStates();
	Object.keys(this.users).forEach(function (userId) {
		this.users[userId].ringStateChanged(ringStates);
	}.bind(this));
};


/*
 * ==================================================
 * Jury President events
 * ==================================================
 */

/**
 * Open a ring on a Jury President's request.
 * @param {JuryPresident} jp
 * @param {Number} ringIndex
 */
Tournament.prototype._jpOpenRing = function (jp, ringIndex) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	assert.integerGte0(ringIndex, 'ringIndex');

	// Get the ring at the given index
	var ring = this.rings[ringIndex];
	assert.ok(ring, "no ring at index=" + ringIndex);

	// Open the ring
	ring.open(jp);
};

/**
 * A Corner Judge's request to join the ring has been rejected by the Jury President.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge that was rejected
 */
Tournament.prototype._jpRejectCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	var cj = this.users[data.id];
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	var ring = this._findCJRing(cj);
	assert.ok(ring, "Corner Judge not in a ring");
	
	// Remove Corner Judge from ring
	ring.removeCJ(cj, "Not authorised to join ring", this._getRingStates());
};

/**
 * A Corner Judge has been removed from the ring by the Jury President.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to remove
 */
Tournament.prototype._jpRemoveCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	var cj = this.users[data.id];
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	var ring = this._findCJRing(cj);
	assert.ok(ring, "Corner Judge not in a ring");
	
	// Remove Corner Judge from ring
	ring.removeCJ(cj, "Removed from ring", this._getRingStates());
};

/**
 * A Jury President has exited the system.
 * @param {JuryPresident} jp
 */
Tournament.prototype._jpExited = function (jp) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	
	// Check if the Jury President has opened a ring
	var ring = this._findJPRing(jp);
	if (ring) {
		// Close the ring
		ring.close(this._getRingStates());
	}
};


/*
 * ==================================================
 * Corner Judge events
 * ==================================================
 */

/**
 * A Corner Judge wishes to join a ring; add the Corner Judge to the ring.
 * @param {CornerJudge} cj
 * @param {Number} ringIndex
 */
Tournament.prototype._cjJoinRing = function (cj, ringIndex) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.integerGte0(ringIndex, 'ringIndex');

	// Get the ring at the given index
	var ring = this.rings[ringIndex];
	assert.ok(ring, "no ring at index=" + ringIndex);
	
	if (ring.isFull()) {
		// If the ring is full, reject the Corner Judge
		cj.rejected("Ring full", this._getRingStates());
	} else {
		// Add the Corner Judge to the ring
		ring.addCJ(cj);
	}
};

/**
 * A Corner Judge has exited the system.
 * @param {CornerJudge} cj
 */
Tournament.prototype._cjExited = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	// Remove event listeners
	util.removeEventListeners(cj, CJ_EVENTS);
	
	var ring = this._findCJRing(cj);
	if (ring) {
		// Remove Corner Judge from ring
		ring.removeCJ(cj, "Exited system", this._getRingStates(), function () {
			// Notify Jury President
			ring.juryPresident.cjExited(cj);
		}.bind(this));
	}
};


exports.Tournament = Tournament;
