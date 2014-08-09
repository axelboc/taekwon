
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
	this.spark.emit('ringLeft', ringIndex, message);
};

CornerJudge.prototype.jpStateChanged = function (connected) {
	this.spark.emit('juryPresidentStateChanged', connected);
};

CornerJudge.prototype.restoreSession = function (spark) {
	var restorationData = parent.restoreSession.call(this, spark);
	restorationData.authorised = this.authorised;
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', restorationData);
};

CornerJudge.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Jury President know that Corner Judge is reconnected
		this.ring.cjStateChanged(this, this.connected);
	}
};

CornerJudge.prototype.exit = function () {
	parent.exit.call(this);
	
	// Leave ring
	if (this.ring) {
		this.ring.removeCJ(this);
		this._debug("> Ring #" + this.ring.number + " left");
	}
};


exports.CornerJudge = CornerJudge;
