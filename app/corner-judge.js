
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function CornerJudge(tournament, primus, spark, sessionId, name) {
	// Call parent constructor
	User.apply(this, arguments);
	this.name = name;
	this.authorised = false;
}

// Inherit from User
util.inherits(CornerJudge, User);
parent = CornerJudge.super_.prototype;


CornerJudge.prototype.getInfo = function () {
	return {
		id: this.id,
		name: this.name
	};
};

CornerJudge.prototype.initSpark = function (spark) {
	parent.initSpark.call(this, spark);
	spark.on('joinRing', this._onJoinRing.bind(this));
	spark.on('score', this._onScore.bind(this));
};

CornerJudge.prototype._onJoinRing = function (index) {
	this._debug("Joining ring #" + (index + 1));
	
	var ring = this.tournament.getRing(index);
	if (ring) {
		// TODO: implement judge slots and check whether ring is full on the server's side
		ring.addCJ(this);
		this.ring = ring;
		this.spark.emit('waitingForAuthorisation', index);
	}
};

CornerJudge.prototype.ringJoined = function (data) {
	this._debug("> Ring joined");
	this.authorised = true;
	this.spark.emit('ringJoined', data);
};

CornerJudge.prototype.ringLeft = function (ringIndex, message) {
	this._debug("> Ring left: " + message);
	this.ring = null;
	this.authorised = false;
	this.spark.emit('ringLeft', ringIndex, message);
};

CornerJudge.prototype._onScore = function (score) {
	if (this.ring) {
		this._debug("Scored " + score.points + " for " + score.competitor);
		this.ring.cjScored(this, score);
	} else {
		this._debug("Error: Corner Judge hasn't joined a ring.");
	}
};

CornerJudge.prototype.scoringStateChanged = function (enabled) {
	this.spark.emit('scoringStateChanged', enabled);
};

CornerJudge.prototype.jpStateChanged = function (connected) {
	this.spark.emit('jpStateChanged', connected);
};

CornerJudge.prototype.restoreSession = function (spark) {
	var data = parent.restoreSession.call(this, spark);
	data.authorised = this.authorised;
	data.scoringEnabled = this.ring && this.ring.scoringEnabled;
	data.jpConnected = this.ring && this.ring.juryPresident && this.ring.juryPresident.connected;
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', data);
};

CornerJudge.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Jury President know that Corner Judge is disconnected/reconnected
		this.ring.cjStateChanged(this, this.connected);
	}
};

CornerJudge.prototype.exit = function () {
	parent.exit.call(this);
	
	// Leave ring
	if (this.ring) {
		this.ring.cjExited(this);
	}
};


exports.CornerJudge = CornerJudge;
