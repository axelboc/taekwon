
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
	['authoriseCJ', 'rejectCJ', 'removeCJ'].forEach(function (event) {
		this.spark.on(event, this['_on' + event.charAt(0).toUpperCase() + event.slice(1)].bind(this));
	}, this);
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

JuryPresident.prototype._onAuthoriseCJ = function (id) {
	if (this.ring) {
		this.ring.cjAuthorised(id);
	} else {
		this._debug("Error: Jury President doesn't have a ring.");
	}
};

JuryPresident.prototype._onRejectCJ = function (id, message) {
	if (this.ring) {
		// Remove Corner Judge from ring
		this.ring.removeCJ(id, message);
	} else {
		this._debug("Error: Jury President doesn't have a ring.");
	}
};

JuryPresident.prototype._onRemoveCJ = function (id) {
	if (this.ring) {
		// Remove Corner Judge from ring
		this.ring.removeCJ(id, "Removed from ring");
	} else {
		this._debug("Error: Jury President doesn't have a ring.");
	}
};

JuryPresident.prototype.authoriseCJ = function (judge) {
	this._debug("Authorising Corner Judge to join ring");
	this.spark.emit('newCornerJudge', {
		id: judge.id,
		name: judge.name,
		connected: judge.connected
	});
};

JuryPresident.prototype.cjStateChanged = function (cornerJudge, connected) {
	this.spark.emit('cjStateChanged', {
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


exports.JuryPresident = JuryPresident;
