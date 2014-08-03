
// Modules
var config = require('./config');
var Ring = require('./ring').Ring;
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;


function Tournament(primus) {
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
	 */
	_onConnection: function (spark) {
		var request = spark.request;
		var sessionId = request.sessionId;
		
		var user = this.users[sessionId];
		if (!user) {
			// Request identification from new user
			this._debug("New user with ID=" + sessionId + ".");
			this._waitForId(spark, sessionId);
		} else {
			// If existing user, confirm user identity
			this._confirmIdentity(spark, sessionId, user);
		}
	},
	
	/**
	 * Socket disconnection.
	 */
	_onDisconnection: function (spark) {
		var sessionId = spark.request.sessionId;
		var user = this.users[sessionId];
		if (user) {
			this._debug("User with ID=" + sessionId + " disconnected.");
			user.disconnected();
		}
	},
	
	/**
	 * Request and wait for user identification.
	 */
	_waitForId: function (spark, sessionId) {
		// Listen for identification
		spark.on('juryPresident', this._onJPConnection.bind(this, spark, sessionId));
		spark.on('cornerJudge', this._onCJConnection.bind(this, spark, sessionId));

		// Inform user that we're waiting for an identification
		spark.emit('waitingForId');
		this._debug("> Waiting for identification...");
	},

	/**
	 * Handle new Jury President connection.
	 */
	_onJPConnection: function (spark, sessionId, password) {
		// Check password
		if (password === config.masterPwd) {
			// Initialise Jury President
			this._debug("> Jury President identified");
			this.users[sessionId] = new JuryPresident(this, this.primus, spark, sessionId);
			this._sendIdResult(spark, true);
		} else {
			// Send failure message to user
			this._debug("> Jury President rejected: wrong password");
			this._sendIdResult(spark, false);
		}
	},

	/**
	 * Handle new Corner Judge connection.
	 */
	_onCJConnection: function (spark, sessionId, name) {
		// Check name
		if (name && name.length > 0) {
			// Initialise Corner Judge
			this._debug("> Corner Judge identified: " + name);
			this.users[sessionId] = new CornerJudge(this, this.primus, spark, sessionId, name);
			this._sendIdResult(spark, true);
		} else {
			// Send failure message to user
			this._debug("> Corner Judge rejected: name not provided");
			this._sendIdResult(spark, false);
		}
	},
	
	/**
	 * Send result of identification process to user.
	 */
	_sendIdResult: function (spark, success) {
		if (success) {
			spark.emit('idSuccess');
			spark.emit('ringAllocations', this.getRingAllocations());
		} else {
			spark.emit('idFail');
		}
	},
	
	_confirmIdentity: function (spark, sessionId, user) {
		// Listen for identification
		spark.on('identityConfirmation', this._onIdentityConfirmation.bind(this, spark, sessionId, user));
		
		// Inform user that we're waiting for an identity confirmation
		spark.emit('confirmIdentity');
		this._debug("> Waiting for identity confirmation...");
	},
	
	/**
	 * Identity confirmation received.
	 */
	_onIdentityConfirmation: function (spark, sessionId, user, identity) {
		if (this.users[sessionId] !== user) {
			this._debug("User has already switched role.");
		} else if (!identity) {
			this._debug("No identity provided");
		} else if (identity !== 'juryPresident' && identity !== 'cornerJudge') {
			this._debug("Identity is invalid: " + identity);
		} else {
			this._debug("> Identity confirmed: " + identity + ".");
			// Check whether user is switching role
			var isJP = identity === 'juryPresident';
			if (isJP && user instanceof JuryPresident || !isJP && user instanceof CornerJudge) {
				// Not switching; restore session
				user.restoreSession(spark);
			} else {
				// Switching; remove user from system and request identification from new user
				this._debug("Switching user with ID=" + sessionId + ".");
				user.remove();
				delete this.users[sessionId];
				this._waitForId(spark, sessionId);
			}
		}
	},
	
	/**
	 * Build and return an array of ring allocations.
	 */
	getRingAllocations: function () {
		return this.rings.reduce(function (arr, ring) {
			arr.push(ring.getAllocation());
			return arr;
		}, []);
	},
	
	/**
	 * Get ring at given index.
	 */
	getRing: function (index) {
		var ring = this.rings[index] || null;
		if (!ring) {
			this._debug("No ring at index=" + index);
		}
		return ring;
	},

	_debug: function (msg) {
		console.log("[Tournament] " + msg);
	}
	
};


exports.Tournament = Tournament;
