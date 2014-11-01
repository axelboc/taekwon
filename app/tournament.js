
// Modules
var assert = require('assert');
var config = require('./config');
var Ring = require('./ring').Ring;
var User = require('./user').User;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;


/**
 * Tournament; the root of the application.
 * @param {Primus} primus
 */
function Tournament(primus) {
	assert(primus, "argument 'primus' must be provided");
	
	// Rings
	this.rings = [];
	this.ringCount = config.ringCount;
	
	for (var i = 0; i < this.ringCount; i += 1) {
		this.rings.push(new Ring(primus, i));
	}
	
	// Users
	this.users = {};
	
	// Socket events
	this.primus = primus;
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
			this._debug("New user with ID=" + sessionId + ". Waiting for identification...");
			this._waitForId(spark, sessionId);
		} else {
			// If existing user, ask user to confirm its identity
			this._debug("Existing user with ID=" + sessionId + ". Confirming identity...");
			this._confirmIdentity(spark, sessionId, user);
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
			this._debug("User with ID=" + sessionId + " disconnected.");
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
		spark.on('juryPresident', this._onJPConnection.bind(this, spark, sessionId));
		spark.on('cornerJudge', this._onCJConnection.bind(this, spark, sessionId));

		// Inform user that we're waiting for an identification
		this._debug("> Waiting for identification...");
		spark.emit('waitingForId');
	},

	/**
	 * Handle new Jury President connection.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {Object} data
	 * 		  {String} data.password - the master password
	 */
	_onJPConnection: function (spark, sessionId, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(typeof data === 'object', "argument 'data' must be an object");
		assert(typeof data.password === 'string', "'data.password' must be a string");
		
		// Check password
		if (data.password === config.masterPwd) {
			// Initialise Jury President
			this._debug("> Jury President identified");
			this.users[sessionId] = new JuryPresident(this, this.primus, spark, sessionId);
			
			// Notify client of successful identification
			this._sendIdResult(spark, true);
		} else {
			// Notify client of failed identification
			this._debug("> Jury President identified but rejected (wrong password)");
			this._sendIdResult(spark, false);
		}
	},

	/**
	 * Handle new Corner Judge connection.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {Object} data
	 * 		  {String} data.password - the corner judge's name
	 */
	_onCJConnection: function (spark, sessionId, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(typeof data === 'object', "argument 'data' must be an object");
		assert(typeof data.name === 'string', "'data.name' must be a string");
		
		// Check name
		if (data.name.length > 0) {
			// Initialise Corner Judge
			this._debug("> Corner Judge identified: " + data.name);
			this.users[sessionId] = new CornerJudge(this, this.primus, spark, sessionId, data.name);
			
			// Notify client of successful identification
			this._sendIdResult(spark, true);
		} else {
			// Notify client of failed identification
			this._debug("> Corner Judge identified but rejected (name not provided)");
			this._sendIdResult(spark, false);
		}
	},
	
	/**
	 * Notify the user of the result of the identification process.
	 * @param {Spark} spark
	 * @param {Boolean} success
	 */
	_sendIdResult: function (spark, success) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof success === 'boolean', "argument 'success' must be a boolean");
		
		if (success) {
			spark.emit('idSuccess');
			
			// Send ring states right away
			spark.emit('ringStates', this.getRingStates());
		} else {
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
		this._debug("> Waiting for identity confirmation...");
		spark.emit('confirmIdentity');
	},
	
	/**
	 * Identity confirmation received.
	 * @param {Spark} spark
	 * @param {String} sessionId
	 * @param {User} user
	 * @param {Object} data
	 * 		  {String} data.identity - the user's identity ('juryPresident' or 'cornerJudge)
	 */
	_onIdentityConfirmation: function (spark, sessionId, user, data) {
		assert(spark, "argument 'spark' must be provided");
		assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
		assert(user instanceof User, "argument 'user' must be a valid User object");
		assert(this.users[sessionId] === user, "user has already switched role");
		assert(typeof data === 'object', "argument 'data' must be an object");
		assert(typeof data.identity === 'string', "'data.identity' must be a string");
		assert(data.identity === 'juryPresident' || data.identity === 'cornerJudge',
			   "identity must be either 'juryPresident' or 'cornerJudge'");
		
		// Check whether user is switching role
		var isJP = data.identity === 'juryPresident';
		if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
			// Not switching; restore session
			this._debug("> Identity confirmed: " + data.identity + ". Restoring session...");
			user.restoreSession(spark);
		} else {
			// Switching; remove user from system and request identification from new user
			this._debug("> User has changed identity. Starting new identification process...");
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

	_debug: function (msg) {
		console.log("[Tournament] " + msg);
	}
	
};


exports.Tournament = Tournament;
