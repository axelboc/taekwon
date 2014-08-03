
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
	this.spark.on('allocateRing', this._onAllocateRing.bind(this));
};

JuryPresident.prototype._onAllocateRing = function (index) {
	this._debug("Allocating ring #" + (index + 1));
	var ring = this.tournament.getRing(index);
	if (ring) {
		if (ring.allocate(this)) {
			this.ring = ring;
			this._debug("> Ring allocated");
			this.spark.emit('ringAllocated', index);
		} else {
			this._debug("> Ring already allocated");
			this.spark.emit('ringAlreadyAllocated', index);
		}
	}
};

JuryPresident.prototype.restoreSession = function (spark) {
	this._debug("Restoring session");
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

JuryPresident.prototype.remove = function () {
	this._debug("Removing Jury President from system");
	parent.remove.call(this);
	
	// Deallocate ring
	if (this.ring) {
		this.ring.deallocate();
		this._debug("> Ring #" + this.ring.number + " deallocated");
	}
};

JuryPresident.prototype._debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
