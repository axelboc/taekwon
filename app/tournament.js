
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
		this.rings.push(new Ring(i));
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
	 * Handle new Jury President connection.
	 */
	_onJPConnection: function (spark, sessionId, password) {
		// Check password
		if (password === config.masterPwd) {
			// Initialise Jury President
			console.log("> Jury President identified");
			this.users[sessionId] = new JuryPresident(primus, spark, sessionId);
			spark.emit('idSuccess');
		} else {
			// Send failure message to client
			console.log("> Jury President rejected: wrong password");
			spark.emit('idFail');
		}
	},

	/**
	 * Handle new Corner Judge connection.
	 */
	_onCJConnection: function (spark, sessionId, name) {
		// Check name
		if (name && name.length > 0) {
			// Initialise Corner Judge
			this.users[sessionId] = new CornerJudge(primus, spark, sessionId, name);
			console.log("> Corner Judge identified: " + name);
			spark.emit('idSuccess');
		} else {
			// Send failure message to client
			console.log("> Corner Judge rejected: name not provided");
			spark.emit('idFail');
		}
	},
	
	/**
	 * Request and wait for client identification.
	 */
	_waitForId: function (spark, sessionId) {
		// Listen for jury president and corner judge identification
		spark.on('juryPresident', this._onJPConnection.bind(this, spark, sessionId));
		spark.on('cornerJudge', this._onCJConnection.bind(this, spark, sessionId));

		// Inform client that we're waiting for an identification
		spark.emit('waitingForId');
		console.log("> Waiting for identification...");
	},
	
	/**
	 * New socket connection.
	 */
	_onConnection: function (spark) {
		var request = spark.request;
		var sessionId = request.sessionId;
		
		var user = this.users[sessionId];
		if (!user) {
			// Create new user
			console.log("New user with ID=" + sessionId + ".");
			this._waitForId();
		} else {
			// If existing user, first check whether user is switching role
			if (isJuryURL && user instanceof JuryPresident || !isJuryURL && user instanceof CornerJudge) {
				// Not switching; restore session
				console.log("Restoring session with ID=" + sessionId + ".");
				user.restoreSession(spark);
			} else {
				// Switching; remove user from system
				console.log("Switching user with ID=" + sessionId + ".");
				user.exit();
				// Create new user
				this.users[sessionId] = isJuryURL ? new JuryPresident(this.primus, spark) : new CornerJudge(this.primus, spark);
			}
		}
	},
	
	/**
	 * Socket disconnection.
	 */
	_onDisconnection: function (spark) {
		var sessionId = spark.request.sessionId;
		var user = this.users[sessionId];
		if (user) {
			console.log("User with ID=" + sessionId + " disconnected.");
			user.disconnected();
		} else {
			console.error("Spark disonnection error: user with ID=" + sessionId + " doesn't exist.");
		}
	}
	
};


exports.Tournament = Tournament;
