
// Modules
var assert = require('assert');
var Spark = require('primus').Spark;
var Ring = require('./ring').Ring;
var User = require('./user').User;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;


/**
 * Tournament; the root of the application.
 * @param {Primus} primus
 * @param {Object} db - the NeDB datastores
 * @param {Object} config
 * 		  {String} config.env
 * 		  {String} config.masterPwd
 * 		  {Number} config.ringCount
 */
function Tournament(primus, db, logger, config) {
	assert(primus, "argument 'primus' must be provided");
	assert(typeof db === 'object', "argument 'db' must be an object");
	assert(db.tournaments && db.rings && db.matches, 
		   "object 'db' must contain three datastores: 'tournaments', 'rings' and 'matches'");
	assert(logger, "argument 'logger' must be provided");
	assert(typeof config === 'object', "argument 'config' must be an object");
	assert(typeof config.env === 'string' && config.env.length > 0, 
		   "'config.env' must be a non-empty string");
	assert(typeof config.masterPwd === 'string', "'config.masterPwd' must be a string");
	assert(typeof config.ringCount === 'number' && config.ringCount > 0 && config.ringCount % 1 === 0, 
		   "'config.ringCount' must be an integer greater than 0");
	
	this.primus = primus;
	this.db = db;
	this.config = config;
	this.logger = logger;
	this._log = this.log.bind(this, 'tournament');
	
	this.rings = [];
	this.users = {};
	
	// Initialise the rings
	for (var i = 1; i <= this.config.ringCount; i += 1) {
		this.rings.push(new Ring(this, i));
	}
	
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
		assert(spark, "argument 'spark' must be provided");
		
		var request = spark.request;
		assert(request, "spark.request is null or undefined");

		var sessionId = request.sessionId;
		assert(sessionId, "session ID is invalid (cookies not transmitted)");
		assert(typeof sessionId === 'string', "session ID must be a string");

		// Look for an existing user with this session ID
		var user = this.users[sessionId];
		
		if (!user) {
			// Request identification from new user
			this._log('debug', "New user with ID=" + sessionId);
			this._waitForId(spark, sessionId);
		} else {
			// If existing user, check whether its previous spark is still open
			this._log('debug', "Existing user with ID=" + sessionId);
			if (user.spark.readyState === Spark.OPEN) {
				// Inform client that a session conflict has been detected
				this._log('debug', "> Session conflict detected");
				spark.emit('wsError', {
					reason: "Session already open"
				});
				spark.end();
			} else {
				// Ask user to confirm its identity
				this._log('debug', "> Confirming identity...");
				this._confirmIdentity(spark, sessionId, user);
			}
		}
	},
	
	/**
	 * Socket disconnection.
	 * @param {Spark} spark
	 */
	_onDisconnection: function (spark) {
		assert(spark, "argument 'spark' must be provided");
		
		var request = spark.request;
		assert(request, "spark.request is null or undefined");
		
		var sessionId = request.sessionId;
		assert(sessionId, "session ID is invalid (cookies not transmitted)");
		assert(typeof sessionId === 'string', "session ID must be a string");
		
		// Look for the user with this session ID
		var user = this.users[sessionId];

		// If the user exists (has been successfully identified), notify it of the disconnection
		if (user) {
			this._log('debug', "User with ID=" + sessionId + " disconnected.");
			user.disconnected();
		}
	},
	
	/**
	 * Request and wait for user identification.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 */
	_waitForId: function (spark, sessionId) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		
		// Listen for identification
		['juryPresident', 'cornerJudge'].forEach(function (evt) {
			spark.on(evt, this._onId.bind(this, spark, sessionId, evt));
		}, this);

		// Inform user that we're waiting for an identification
		this._log('debug', "> Waiting for identification...");
		spark.emit('waitingForId');
	},

	/**
	 * Identification received.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {String} type - 'cornerJudge' or 'juryPresident'
	 * @param {Object} data
	 * 		  {String} data.password - the master password
	 */
	_onId: function (spark, sessionId, type, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		
		// If another user has logged in with the same sessionID since the 'waitingForId' 
		// notification was sent, inform client that a session conflict has been detected
		if (this.users[sessionId]) {
			this._log('debug', "> Session conflict detected");
			spark.emit('wsError', {
				reason: "Session already open"
			});
			spark.end();
			return;
		}
		
		assert(typeof type === 'string', "argument 'type' must be a string");
		assert(type === 'cornerJudge' || type === 'juryPresident',
			   "argument 'type' must be 'cornerJudge' or 'juryPresident'");
		assert(typeof data === 'object' && data, "argument 'data' must be an object");
		
		var user;
		switch (type) {
			case 'juryPresident':
				// Check password
				assert(typeof data.password === 'string', "'data.password' must be a string");
				if (data.password === this.config.masterPwd) {
					// Initialise Jury President
					user = new JuryPresident(this, this.primus, spark, sessionId);
				}
				break;
			case 'cornerJudge':
				// Check name
				assert(typeof data.name === 'string', "'data.name' must be a string");
				if (data.name.length > 0) {
					// Initialise Corner Judge
					user = new CornerJudge(this, this.primus, spark, sessionId, data.name);
				}
				break;
		}
		
		if (user) {
			// Store user
			this.users[sessionId] = user;
			
			// Notify client of success
			this._log('debug', "> " + type + " identified");
			spark.emit('idSuccess');
			
			// Send ring states right away
			spark.emit('ringStates', this.getRingStates());
			
			// Log
			this._log('newUser', {
				sessionId: sessionId,
				type: type,
				name: data.name
			});
		} else {
			// Notify client of failure
			this._log('debug', "> " + type + " identified but rejected");
			spark.emit('idFail');
		}
	},
		
	/**
	 * Ask a user to confirm its identity.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {User} user
	 */
	_confirmIdentity: function (spark, sessionId, user) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(user instanceof User, "argument 'user' must be a valid User object");
		
		// Listen for identity confirmation
		spark.on('identityConfirmation', this._onIdentityConfirmation.bind(this, spark, sessionId, user));
		
		// Send identity confirmation request
		this._log('debug', "> Waiting for identity confirmation...");
		spark.emit('confirmIdentity');
	},
	
	/**
	 * Identity confirmation received.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {User} user
	 * @param {Object} data
	 * 		  {String} data.identity - the user's identity ('juryPresident' or 'cornerJudge')
	 */
	_onIdentityConfirmation: function (spark, sessionId, user, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(user instanceof User, "argument 'user' must be a valid User object");
		assert(this.users[sessionId] === user, "user has already switched role");
		assert(typeof data === 'object' && data, "argument 'data' must be an object");
		assert(typeof data.identity === 'string', "'data.identity' must be a string");
		assert(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			   "identity must be either 'juryPresident' or 'cornerJudge'");
		
		// Check whether user is switching role
		var isJP = data.identity === 'juryPresident';
		if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
			// Not switching; restore session
			this._log('debug', "> Identity confirmed: " + data.identity + ". Restoring session...");
			user.restoreSession(spark);
		} else {
			// Switching; remove user from system and request identification from new user
			this._log('debug', "> User has changed identity. Starting new identification process...");
			user.exit();
			delete this.users[sessionId];
			this._waitForId(spark, sessionId);
		}
	},
	
	/**
	 * Build and return an array of the rings' states.
	 * @return {Array}
	 */
	getRingStates: function () {
		return this.rings.reduce(function (arr, ring) {
			arr.push(ring.getState());
			return arr;
		}, []);
	},
	
	/**
	 * Broadcast to all users that the state of a ring (open/closed) has changed.
	 * @param {Ring} ring
	 */
	ringStateChanged: function (ring) {
		assert(ring instanceof Ring, "argument 'ring' must be a valid Ring object");
		
		// Retrieve the state of the ring
		var state = ring.getState();
		
		this.primus.forEach(function (spark) {
			spark.emit('ringStateChanged', state);
		}.bind(this));
	},
	
	/**
	 * Get ring at given index.
	 * @param {Number} index - the index of the ring, as a positive integer
	 * @return {Ring}
	 */
	getRing: function (index) {
		assert(typeof index === 'number' && index >= 0 && index % 1 === 0, 
			   "argument 'index' must be a positive integer");
		
		var ring = this.rings[index];
		assert(ring, "no ring at index=" + index);
		
		return ring;
	},

	/**
	 * Add a new entry to the tournament's log file.
	 * When in development, if argument `name` is 'debug', argument `data` is printed to the console.
	 * @param {String} topic - (e.g. 'ring', 'match', etc.)
	 * @param {String} name - (e.g. 'opened', 'started', etc.)
	 * @param {String|Object} data - optional message or data to store with the log entry
	 */
	log: function (topic, name, data) {
		assert(typeof topic === 'string' && topic.length > 0, "argument 'topic' must be a non-empty string");
		assert(typeof name === 'string' && name.length > 0, "argument 'name' must be a non-empty string");
		assert(typeof data === 'undefined' || typeof data === 'string' || typeof data === 'object', 
			   "if argument 'data' is provided, it must be a string or an object");
		
		// When in development, print debug messages to the console 
		if (name === 'debug' && this.config.env === 'development') {
			console.log('[' + topic + ']', data);
		}
		
		// Add a new entry to the logs
		this.logger.insert({
			timestamp: new Date(),
			topic: topic,
			name: name,
			data: data
		}, db.cb);
	}
	
};


exports.Tournament = Tournament;
