
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function JuryPresident(tournament, primus, spark, sessionId) {
	// Call parent constructor
	User.apply(this, arguments);
}

// Inherit from User
util.inherits(JuryPresident, User);
parent = JuryPresident.super_.prototype;


JuryPresident.prototype.initSpark = function (spark) {
	parent.initSpark.call(this, spark);
	this.spark.on('openRing', this._onOpenRing.bind(this));
};

JuryPresident.prototype._onOpenRing = function (index) {
	this._debug("Opening ring #" + (index + 1));
	var ring = this.tournament.getRing(index);
	if (ring) {
		if (ring.open(this)) {
			this._debug("> Ring opened");
			this.ring = ring;
			this.spark.emit('ringOpened', index);
		} else {
			this._debug("> Ring already open");
			this.spark.emit('ringAlreadyOpen', index);
		}
	}
};

JuryPresident.prototype.authoriseCornerJudge = function (name) {
	this._debug("");
};

JuryPresident.prototype.cjStateChanged = function (cornerJudge, connected) {
	this.spark.emit('cornerJudgeStateChanged', {
		id: cornerJudge.id,
		connected: connected
	});
};

JuryPresident.prototype.restoreSession = function (spark) {
	var restorationData = parent.restoreSession.call(this, spark);
	restorationData.cornerJudges = [];
	
	// Add corner judges
	/*if (this.ring) {
		var addJudge = function (judge) {
			restorationData.cornerJudges.push({
				id: judge.id,
				name: judge.name,
				connected: judge.connected,
				authorised: judge.authorised
			});
		}
		
		// Add authorised judges
		this.ring.cornerJudges.forEach(addJudge, this);
		// Add judges waiting for authorisation
		Object.keys(this.waitingList).forEach(function (id) {
			addJudge(this.waitingList[id]);
		}, this);
		
	}*/
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', restorationData);
};

JuryPresident.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Corner Judges know that Jury President is reconnected
		this.ring.jpStateChanged(this.connected);
	}
};

JuryPresident.prototype.remove = function () {
	this._debug("Removing from system");
	parent.remove.call(this);
	
	// Close ring
	if (this.ring) {
		this.ring.close();
		this._debug("> Ring #" + this.ring.number + " closed");
	}
};

JuryPresident.prototype._debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
