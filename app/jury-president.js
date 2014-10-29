
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


/**
 * Jury President.
 * @param {Tournament} tournament
 * @param {Primus} primus
 * @param {Spark} spark
 * @param {String} sessionId
 */
function JuryPresident(tournament, primus, spark, sessionId) {
	// Call parent constructor, which will assert the arguments
	User.apply(this, arguments);
}

// Inherit from User
util.inherits(JuryPresident, User);
// Keep a pointer to the parent prototype
parent = JuryPresident.super_.prototype;


/**
 * Register event handlers on the spark.
 * @param {Spark} spark
 */
JuryPresident.prototype.initSpark = function (spark) {
	// Call parent function, which will assert the argument
	parent.initSpark.call(this, spark);
	
	this.spark.on('openRing', this._onOpenRing.bind(this));
	this.spark.on('enableScoring', this._onEnableScoring.bind(this));
	['authoriseCJ', 'rejectCJ', 'removeCJ'].forEach(function (event) {
		this.spark.on(event, this['_on' + event.charAt(0).toUpperCase() + event.slice(1)].bind(this));
	}, this);
};

/**
 * Open a ring.
 * @param {Number} index - the index of the ring, as a positive integer
 */
JuryPresident.prototype._onOpenRing = function (index) {
	this._debug("Opening ring #" + (index + 1));
	assert(typeof index === 'number' && index >= 0 && index % 1 === 0, 
		   "argument 'index' must be a positive integer");
	
	// Retrieve the ring at the given index
	var ring = this.tournament.getRing(index);
	
	// Open the ring
	ring.open(this);
	this.ring = ring;

	// Acknowledge that the ring has been opened
	this.spark.emit('ringOpened', index);
	this._debug("> Ring opened");
};

JuryPresident.prototype._onEnableScoring = function (enable) {
	if (this.ring) {
		this.ring.enableScoring(enable);
	} else {
		this._debug("Error: Jury President doesn't have a ring.");
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

JuryPresident.prototype.authoriseCJ = function (cj) {
	this._debug("Authorising Corner Judge to join ring");
	this.spark.emit('newCornerJudge', {
		id: cj.id,
		name: cj.name,
		connected: cj.connected
	});
};

JuryPresident.prototype.cjScored = function (cornerJudge, score) {
	score.judgeId = cornerJudge.id;
	this.spark.emit('cjScored', score);
};

JuryPresident.prototype.cjConnectionStateChanged = function (cornerJudge, connected) {
	this.spark.emit('cjConnectionStateChanged', {
		id: cornerJudge.id,
		connected: connected
	});
};

JuryPresident.prototype.cjExited = function (cornerJudge) {
	this.spark.emit('cjExited', cornerJudge.id);
};

JuryPresident.prototype.restoreSession = function (spark) {
	var data = parent.restoreSession.call(this, spark);
	data.cornerJudges = [];
	
	// Add corner judges
	if (this.ring) {
		this.ring.cornerJudges.forEach(function (judge) {
			data.cornerJudges.push({
				id: judge.id,
				name: judge.name,
				connected: judge.connected,
				authorised: judge.authorised
			});
		}, this);
	}
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', data);
};

JuryPresident.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Corner Judges know that Jury President is disconnected/reconnected
		this.ring.jpConnectionStateChanged(this.connected);
	}
};

JuryPresident.prototype.exit = function () {
	parent.exit.call(this);
	
	// Close ring
	if (this.ring) {
		this.ring.close();
		this.ring = null;
	}
};


exports.JuryPresident = JuryPresident;
