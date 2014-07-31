
// Modules
var config = require('config');
var Ring = require('ring').Ring;


function Tournament(primus) {
	// Rings
	this.rings = [];
	this.ringCount = config.ringCount;
	
	for (var i = 0; i < ringCount; i += 1) {
		this.rings.push(new Ring(i));
	}
	
	// Users
	this.users = {};
	
	// Socket events
	this.primus = primus;
	primus.on('connection', this._onUserConnection.bind(this));
}


Tournament.prototype = {
	
	_onUserConnection: function (spark) {
		var request = spark.request;
		var sessionId = request.sessionId;
		
		var user = this.users[sessionId];
		var isJuryURL = /\/jury/.test(request.path);

		if (!user) {
			// Create new user
			console.log("New user with ID=" + sessionId + ".");
			this.users[sessionId] = isJuryURL ? new JuryPresident(spark) : new CornerJudge(spark);
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
				this.users[sessionId] = isJuryURL ? new JuryPresident(spark) : new CornerJudge(spark);
			}
		}
	}
	
};


exports.Tournament = Tournament;
