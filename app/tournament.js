
// Modules
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
 * New socket connection.
 * @param {Spark} spark
 */
Tournament.prototype._onConnection = function (spark) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');

	var request = spark.request;
	assert.ok(request, "`spark.request` is " + request);

	var sessionId = request.sessionId;
	assert.ok(sessionId, "session ID is invalid (cookies not transmitted)");
	assert.string(sessionId, 'sessionId');

	// Look for an existing user with this session ID
	var user = this.users[sessionId];

	if (!user) {
		// Request identification from new user
		logger.debug("New user with ID=" + sessionId);
		this._identifyUser(sessionId, spark);
	} else {
		// If existing user, check whether its previous spark is still open
		logger.debug("Existing user with ID=" + sessionId);
		if (user.spark && user.spark.readyState === Spark.OPEN) {
			// Inform client that a session conflict has been detected
			logger.debug("> Session conflict detected");
			spark.emit('wsError', {
				reason: "Session already open"
			});
			spark.end();
		} else {
			// Ask user to confirm its identity
			logger.debug("> Confirming identity...");
			this._confirmUserIdentity(sessionId, spark, user);
		}
	}
};

/**
 * Socket disconnection.
 * @param {Spark} spark
 */
Tournament.prototype._onDisconnection = function (spark) {
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');

	var request = spark.request;
	assert.ok(request, "`spark.request` is " + request);

	var sessionId = request.sessionId;
	assert.ok(sessionId, "session ID is invalid (cookies not transmitted)");
	assert.string(sessionId, 'sessionId');

	// Look for the user with this session ID
	var user = this.users[sessionId];

	// If the user exists (has been successfully identified), notify it of the disconnection
	if (user) {
		logger.debug("User with ID=" + sessionId + " disconnected.");
		user.disconnected();
	}
};

/**
 * Request and wait for user identification.
 * @param {String} sessionId
 * @param {Spark} spark
 */
Tournament.prototype._identifyUser = function (sessionId, spark) {
	assert.string(sessionId, 'sessionId');
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');

	var onIdentification = function (data) {
		assert.object(data, 'data');
		assert.string(data.identity, 'data.identity');
		assert.ok(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			   "`data.identity` must be 'juryPresident' or 'cornerJudge'");

		// Check identification
		if (data.identity === 'juryPresident' && data.password !== process.env.MASTER_PWD ||
			data.identity === 'cornerJudge' && (typeof data.name !== 'string' || data.name.length === 0)) {
			// Identification failed
			logger.debug("> Failed identification (identity=" + data.identity + ")");
			spark.emit('idFail');
			
			// Listen for identification again
			spark.once('identification', onIdentification);
			return;
		}

		// Insert the new user in the database
		DB.insertUser(this.id, sessionId, data.identity, data.name, function (newDoc) {
			if (newDoc) {
				var user = this._initUser(spark, true, newDoc);
				logger.info('newUser', newDoc);

				// Notify client of success and send along ring states
				logger.debug("> Successful identification (identity=" + data.identity + ")");
				user.idSuccess(this._getRingStates());
			} else {
				// If database insertion failed, notify client that identification failed
				spark.emit('idFail');
				spark.once('identification', onIdentification);
			}
		}.bind(this));
	}.bind(this);
	
	// Listen for identification
	spark.once('identification', onIdentification);

	// Inform user that we're waiting for an identification
	logger.debug("> Waiting for identification...");
	spark.emit('identify');
};

/**
 * Ask a user to confirm its identity.
 * @param {String} sessionId
 * @param {Spark} spark
 * @param {User} user
 */
Tournament.prototype._confirmUserIdentity = function (sessionId, spark, user) {
	assert.string(sessionId, 'sessionId');
	assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
	assert.instanceOf(user, 'user', User, 'User');

	// Listen for identity confirmation
	spark.once('identityConfirmation', function _onIdentityConfirmation(data) {
		assert.object(data, 'data');
		assert.string(data.identity, 'data.identity');
		assert.ok(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			   "`data.identity` must be 'juryPresident' or 'cornerJudge'");

		// Check whether user is switching role
		var isJP = data.identity === 'juryPresident';
		if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
			// Not switching; restore session
			logger.debug("> Identity confirmed: " + data.identity + ". Restoring session...");
			user.restoreSession(spark, this._getRingStates());
		} else {
			// Switching; remove user from system and request identification from new user
			logger.debug("> User has changed identity. Starting new identification process...");
			DB.removeUser(user, function () {
				user.exit();
				delete this.users[sessionId];
				this._identifyUser(sessionId, spark);
			}.bind(this));
		}
	}.bind(this));

	// Send identity confirmation request
	spark.emit('confirmIdentity');
};

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
 * Instanciate and initialise a new Ring object based on a database document.
 * @param {Object} doc
 */
Tournament.prototype._initRing = function (doc) {
	assert.object(doc, 'doc');

	var ring = new Ring(doc._id, doc.index, doc.slotCount);
	this.rings[doc.index] = ring;

	// Jury President
	if (doc.jpId) {
		var jp = this.users[doc.jpId];
		if (jp) {
			jp.ring = ring;
			ring.initJP(jp);
		} else {
			logger.error("Jury President is not in the system", {
				id: doc.jpId
			});
		}
	}

	// Corner Judges
	if (doc.cjIds) {
		doc.cjIds.forEach(function (id) {
			var cj = this.users[id];
			if (cj) {
				cj.ring = ring;
				ring.initCJ(cj);
			} else {
				logger.error("Corner Judge is not in the system", {
					id: id
				});
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
Tournament.prototype.initRings = function (count, cb) {
	assert.integerGt0(count, 'count');
	assert.function(cb, 'cb');

	// Retrieve the number of corner judge slots per ring
	var slotCount = parseInt(process.env.CJS_PER_RING, 10);
	assert.ok(!isNaN(slotCount) && slotCount > 0 && slotCount % 1 === 0,
		   "environment configuration `CJS_PER_RING` must be a positive integer");

	// Insert new rings in the database one at a time
	DB.insertRings(this.id, count, slotCount, function (newDocs) {
		newDocs.forEach(this._initRing, this);
		logger.debug("Rings initialised");
		cb();
	}.bind(this));
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
 * @param {String} id - the ID of the Corner Judge who has been rejected
 */
Tournament.prototype._jpRejectCJ = function (id) {
	assert.string(id, 'id');
	
	var cj = this.users[id];
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(cj.ring, "Corner Judge not in a ring");
	
	// Remove Corner Judge from ring
	cj.ring.removeCJ(cj, "Not authorised to join ring", this._getRingStates());
};

/**
 * A Corner Judge has been removed from the ring by the Jury President.
 * @param {String} id - the ID of the Corner Judge who has been removed
 */
Tournament.prototype._jpRemoveCJ = function (id) {
	assert.string(id, 'id');
	
	var cj = this.users[id];
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(cj.ring, "Corner Judge not in a ring");
	
	// Remove Corner Judge from ring
	cj.ring.removeCJ(cj, "Removed from ring", this._getRingStates());
};

/**
 * A Jury President has exited the system.
 * @param {JuryPresident} jp
 */
Tournament.prototype._jpExited = function (jp) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	
	if (jp.ring) {
		// Close the ring
		jp.ring.close(this._getRingStates());
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
	
	var ring = cj.ring;
	if (ring) {
		// Remove Corner Judge from ring
		ring.removeCJ(cj, "Exited system", this._getRingStates());

		// Notify Jury President
		ring.juryPresident.cjExited(cj);
	}
};


exports.Tournament = Tournament;
