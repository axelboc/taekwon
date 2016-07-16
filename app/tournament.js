'use strict';

// Dependencies
var asyncEach = require('async/each');
var Primus = require('primus');
var Emit = require('primus-emit');

var config = require('../config/config.json');
var assert = require('./lib/assert');
var log = require('./lib/log');
var util = require('./lib/util');
var DB = require('./lib/db');
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
 */
function Tournament(id, server) {
	assert.string(id, 'id');
	
	this.id = id;
	this.rings = [];
	this.users = {};
	this.logger = log.createLogger('tournament', "Tournament", { id: id });
}

/**
 * The tournament is ready to receive Web Socket connections.
 * Initialise Primus, listen for spark connection and disconnection events, and start the Express server.
 * @param {Server} server
 */
Tournament.prototype.ready = function(server) {
	assert.provided(server, 'server');
	
	// Initialise Primus
	this.primus = new Primus(server, {
		transformer: 'sockjs'
	});
	
	// Add emit plugin and remove client library middleware
	this.primus.use('emit', Emit);
	this.primus.remove('primus.js');
	
	// Listen for incoming socket connections
	this.primus.on('connection', this._onConnection.bind(this));
	
	// Start server
	server.listen(process.env.PORT);
};

/**
 * Build and return an array of the rings' states.
 * @return {Array}
 */
Tournament.prototype._getRingStates = function () {
	return this.rings.map(function (ring) {
		return {
			index: ring.index,
			open: ring.juryPresident !== null
		};
	});
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
	assert.instanceOf(spark, 'spark', Primus.Spark, 'Spark');
	assert.object(spark.query, 'spark.query');
	
	var identity = spark.query.identity;
	assert.string(identity, 'identity');
	
	// Check whether the user ID is passed as a query parameter and if it matches an existing user
	// In some situations, such as when the database is reset, an ID might not match any user
	var id = spark.query.id;
	if (!id || !this.users[id]) {
		// New user; request identification
		this.logger.info('newUser', identity, { identity: identity });
		this._identifyUser(spark);
		return;
	}
	
	// Existing user
	var user = this.users[id];

	// Check whether the user's previous spark is still open
	if (user.spark && user.spark.readyState === Primus.Spark.OPEN) {
		// Inform client that a session conflict has been detected
		this.logger.info('sessionConflict', id, { id: id });
		spark.emit('io.error', { message: "Session already open" });
		spark.end();
		return;
	}

	// Check whether the user is switching role
	var isJP = identity === 'juryPresident';
	if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
		// Not switching; restore session
		this.logger.info('identityConfirmed', identity, { identity: identity });
		this._restoreUserSession(user, spark);
	} else {
		// Switching; remove user from system and request identification from new user
		this.logger.info('identityChanged', identity, { identity: identity });
		this._removeUser(user, this._identifyUser.bind(this, spark));
	}
};

/**
 * Request and wait for user identification.
 * @param {Spark} spark
 */
Tournament.prototype._identifyUser = function (spark) {
	assert.instanceOf(spark, 'spark', Primus.Spark, 'Spark');

	// Listen for identification
	spark.once('identification', this._onIdentification.bind(this, spark));

	// Inform user that we're waiting for an identification
	spark.emit('root.showView', { view: 'loginView' });
	spark.emit('io.hideBackdrop');
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
	assert.instanceOf(spark, 'spark', Primus.Spark, 'Spark');
	assert.object(data, 'data');
	assert.string(data.identity, 'data.identity');
	assert.ok(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			  "`data.identity` must be 'juryPresident' or 'cornerJudge'");
	
	// Get user ID from query
	var userId = spark.query.id;

	// Check identification
	if (data.identity === 'juryPresident' && data.value !== config.jpPwd ||
		data.identity === 'cornerJudge' && (typeof data.value !== 'string' || data.value.length === 0)) {
		
		this.logger.info('idFail', userId, {
			userId: userId,
			identity: data.identity,
			value: data.value
		});

		// Shake field
		spark.emit('login.shakeResetField');

		// Update instruction text if appropriate
		if (data.identity === 'juryPresident') {
			spark.emit('login.setInstr', { text: "Password incorrect" });
		}

		// Listen for identification again
		spark.once('identification', this._onIdentification.bind(this, spark));
		return;
	}

	// Successful identification; insert the new user in the database (or update it)
	DB.insertUser(this.id, userId, data.identity, data.value, function (newDoc) {
		var user = this._initUser(spark, true, newDoc);
		this.logger.info('idSuccess', userId, { user: newDoc });

		// Update ring states and notify client of success
		user.ringStateChanged(this._getRingStates());
		user.idSuccess();
	}.bind(this));
};


/*
 * ==================================================
 * Initialisation, restoration, removal
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
 * @param {Function} cb
 */
Tournament.prototype.restoreUsers = function (cb) {
	assert.function(cb, 'cb');

	DB.findUsers(this.id, function (docs) {
		docs.forEach(this._initUser.bind(this, null, false));
		
		if (docs.length > 0) {
			this.logger.info('usersRestored', { users: docs });
		} else {
			this.logger.info('noUsersToRestore', { users: docs });
		}
		
		cb();
	}.bind(this));
};

/**
 * Restore a user's session.
 * @param {User} user
 * @param {Spark} spark
 */
Tournament.prototype._restoreUserSession = function (user, spark) {
	assert.instanceOf(user, 'user', User, 'User');
	assert.instanceOf(spark, 'spark', Primus.Spark, 'Spark');
	
	// Initialise the new spark
	user.initSpark(spark);
	user.ringStateChanged(this._getRingStates());
	
	// Restore Jury President
	var ring;
	if (user instanceof JuryPresident) {
		ring = this._findJPRing(user);
		if (!ring) {
			user.idSuccess();
		} else {
			user.ringOpened(ring);
			if (ring.match) {
				user.restoreMatchState(ring.match);
			}
		}
	
	// Restore Corner Judge
	} else {
		ring = this._findCJRing(user);
		if (!ring) {
			user.idSuccess();
		} else {
			if (!user.authorised) {
				user.waitingForAuthorisation();
			} else {
				user.ringJoined(ring);
				if (ring.match) {
					user.matchStateChanged(ring, ring.match, '', '', ring.match.state.current);
				}
			}
		}
	}
	
	this.logger.info('sessionRestored', user.id, { userId: user.id });
};

/**
 * Remove a user from the system.
 * @param {User} user
 * @param {Function} cb
 */
Tournament.prototype._removeUser = function (user, cb) {
	assert.instanceOf(user, 'user', User, 'User');
	assert.function(cb, 'cb');
	
	// Remove user from database
	DB.removeUser(user, function () {
		// Notify user to exit, then delete it
		user.exit();
		delete this.users[user.id];
		
		this.logger.info('userRemoved', user.id, { userId: user.id });
		cb();
	}.bind(this));
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
			this.logger.error('noUserWithId', doc.jpId, { jpId: doc.jpId });
		}
	}

	// Corner Judges
	if (doc.cjIds) {
		doc.cjIds.forEach(function (id) {
			var cj = this.users[id];
			if (cj) {
				ring.initCJ(cj);
			} else {
				this.logger.error('noUserWithID', id, { cjId: id });
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
	DB.insertRings(this.id, count, config.cjsPerRing, defaults, function (newDocs) {
		newDocs.forEach(this._initRing, this);
		this.logger.info('ringsCreated', { rings: newDocs });
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
		asyncEach(this.rings, function (ring, next) {
			ring.restoreMatch(next);
		}, function () {
			this.logger.info('ringsRestored', { rings: docs });
			cb();
		}.bind(this));
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
	}, this);
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
	ring.removeCJ(cj, "Not authorised to join ring");
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
	ring.removeCJ(cj, "Removed from ring");
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
		ring.close();
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
		cj.rejected("Ring full");
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
		ring.removeCJ(cj, "Exited system");
	}
};

module.exports.Tournament = Tournament;
