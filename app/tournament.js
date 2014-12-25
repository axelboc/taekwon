
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('tournament');
var DB = require('./lib/db');
var async = require('async');
var Spark = require('primus').Spark;
var Ring = require('./ring').Ring;
var User = require('./user').User;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;


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


Tournament.prototype = {
	
	/**
	 * New socket connection.
	 * @param {Spark} spark
	 */
	_onConnection: function (spark) {
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
	},
	
	/**
	 * Socket disconnection.
	 * @param {Spark} spark
	 */
	_onDisconnection: function (spark) {
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
	},
	
	/**
	 * Request and wait for user identification.
	 * @param {String} sessionId
	 * @param {Spark} spark
	 */
	_identifyUser: function (sessionId, spark) {
		assert.string(sessionId, 'sessionId');
		assert.instanceOf(spark, 'spark', this.primus.Spark, 'Spark');
		
		// Listen for identification
		spark.on('identification', function _onIdentification(data) {
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
				return;
			}
			
			// Insert the new user in the database
			DB.insertUser(this.id, sessionId, data.identity, data.name, function (newDoc) {
				var user = this._initUser(newDoc, spark, true);
				logger.info('newUser', newDoc);
				
				// Notify client of success
				logger.debug("> Successful identification (identity=" + data.identity + ")");
				spark.emit('idSuccess');

				// Send ring states right away
				spark.emit('ringStates', this._getRingStates());
			}.bind(this));
			
		}.bind(this));

		// Inform user that we're waiting for an identification
		logger.debug("> Waiting for identification...");
		spark.emit('identify');
	},
	
	/**
	 * Ask a user to confirm its identity.
	 * @param {String} sessionId
	 * @param {Spark} spark
	 * @param {User} user
	 */
	_confirmUserIdentity: function (sessionId, spark, user) {
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
					this._identifyUser(spark, sessionId);
				}.bind(this));
			}
		}.bind(this));
		
		// Send identity confirmation request
		logger.debug("> Waiting for identity confirmation...");
		spark.emit('confirmIdentity');
	},
	
	/**
	 * Instanciate and initialise a new JuryPresident or CornerJudge object based on a user database document.
	 * @param {Spark} spark
	 * @param {Boolean} connected
	 * @param {Object} doc
	 * @return {User}
	 */
	_initUser: function (spark, connected, doc) {
		assert.object(doc, 'doc');
		
		var user;
		switch(doc.identity) {
			case 'juryPresident':
				user = new JuryPresident(doc._id, spark, connected);
				user.on('openRing', this._jpOpenRing.bind(this));
				break;
			case 'cornerJudge':
				user = new CornerJudge(doc._id, spark, connected, doc.name, doc.authorised);
				user.on('joinRing', this._cjJoinRing.bind(this));
				break;
		}
		
		this.users[user.id] = user;
		return user;
	},
	
	/**
	 * Instanciate and initialise a new Ring object based on a ring database document.
	 * @param {Object} doc
	 */
	_initRing: function (doc) {
		assert.object(doc, 'doc');
		
		var ring = new Ring(doc._id, doc.index, doc.slotCount);
		this.rings[doc.index] = ring;
		
		// Jury President
		if (doc.jpId) {
			var jp = this.users[doc.jpId];
			if (jp) {
				ring.juryPresident = jp;
				jp.ring = ring;
			}
		}
		
		// Corner Judges
		if (doc.cjIds) {
			doc.cjIds.forEach(function (id) {
				var cj = this.users[id];
				if (cj) {
					ring.cornerJudges.push(this.users[id]);
					cj.ring = ring;
				}
			});
		}
		
		// Listen for ring events
		var func = this._ringStateChanged.bind(this);
		ring.on('opened', func);
		ring.on('closed', func);
	},
	
	/**
	 * Initialise the tournament's rings.
	 * @param {Number} count - the number of rings, as an integer greater than 0
	 * @param {Function} cb - a function called when the initialisation is complete
	 */
	initRings: function (count, cb) {
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
	},
	
	/**
	 * Retore the tournament's users.
	 * @param {Function} cb - a function called when the restoration is complete
	 */
	restoreUsers: function (cb) {
		assert.function(cb, 'cb');
		
		DB.findUsers(this.id, function (docs) {
			docs.forEach(this._initUser.bind(this, null, false));
			logger.debug("Users restored");
			cb();
		}.bind(this));
	},
	
	/**
	 * Restore the tournament's rings.
	 * @param {Function} cb - a function called when the restoration is complete
	 */
	restoreRings: function (cb) {
		assert.function(cb, 'cb');
		
		DB.findRings(this.id, function (docs) {
			docs.forEach(this._initRing, this);
			logger.debug("Rings restored");
			cb();
		}.bind(this));
	},
	
	/**
	 * Open a ring on a Jury President's request.
	 * @param {JuryPresident} jp
	 * @param {Number} ringIndex
	 */
	_jpOpenRing: function (jp, ringIndex) {
		assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
		assert.integerGte0(index, 'index');
		
		// Get the ring at the given index
		var ring = this.rings[index];
		assert.ok(ring, "no ring at index=" + index);
		
		// Open the ring
		ring.open(jp);
	},
	
	/**
	 * A Corner Judge wishes to join a ring; add the Corner Judge to the ring.
	 * @param {JuryPresident} jp
	 * @param {Number} ringIndex
	 */
	_cjJoinRing: function (cj, ringIndex) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		assert.integerGte0(index, 'index');
	
		// Get the ring at the given index
		var ring = this.rings[index];
		assert.ok(ring, "no ring at index=" + index);

		// Add the Corner Judge to the ring
		ring.addCJ(this);
	},
	
	/**
	 * Build and return an array of the rings' states.
	 * @return {Array}
	 */
	_getRingStates: function () {
		return this.rings.reduce(function (arr, ring) {
			arr.push(ring.getState());
			return arr;
		}, []);
	},
	
	/**
	 * Broadcast to all users that the state of a ring (open/closed) has changed.
	 * @param {Ring} ring
	 */
	_ringStateChanged: function (ring) {
		assert.instanceOf(ring, 'ring', Ring, 'Ring');
		
		var state = ring.getState();
		this.primus.forEach(function (spark) {
			spark.emit('ringStateChanged', state);
		}.bind(this));
	}
	
};


exports.Tournament = Tournament;
