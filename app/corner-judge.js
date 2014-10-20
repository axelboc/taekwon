
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function CornerJudge(tournament, primus, spark, sessionId, name) {
	// Call parent constructor
	User.apply(this, arguments);
	this.name = name;
	this.authorised = false;
	
	// Store scores for undo feature
	this.scores = [];
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
	spark.on('undo', this._onUndo.bind(this));
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

// TODO: log error when an unauthorised or disconnected judge scores/undoes a score
CornerJudge.prototype._onScore = function (score) {
	if (this.ring) {
		this._debug("Scoring " + score.points + " for " + score.competitor);
		this.ring.cjScored(this, score, this.scoreConfirmed.bind(this, score));
	} else {
		this._debug("Error: Corner Judge hasn't joined a ring.");
	}
};

CornerJudge.prototype.scoreConfirmed = function (score) {
	this._debug("> Score confirmed");
	this.scores.push(score);
	this.spark.emit('scoreConfirmed', score);
	
	if (this.scores.length === 1){
		this.spark.emit('canUndo', true);
	}
};

CornerJudge.prototype.scoringStateChanged = function (enabled) {
	this.spark.emit('scoringStateChanged', enabled);
};

CornerJudge.prototype._onUndo = function () {
	if (this.scores.length > 0) {
		// Retrieve latest score
		var score = this.scores.pop();
		
		// Propagate like a normal score
		if (this.ring) {
			this._debug("Undoing score of " + score.points + " for " + score.competitor);
			
			// Negate points value
			score.points *= -1;
			
			this.ring.cjScored(this, score, this.undoConfirmed.bind(this, score));
		} else {
			this._debug("Error: Corner Judge hasn't joined a ring.");
		}
		
		if (this.scores.length === 0) {
			this.spark.emit('canUndo', false);
		}
	} else {
		this._debug("Error: nothing to undo");
	}
};

CornerJudge.prototype.undoConfirmed = function (score) {
	this._debug("> Undo confirmed");
	this.spark.emit('undoConfirmed', score);
};

CornerJudge.prototype.jpConnectionStateChanged = function (connected) {
	this.spark.emit('jpConnectionStateChanged', connected);
};

CornerJudge.prototype.restoreSession = function (spark) {
	var data = parent.restoreSession.call(this, spark);
	data.authorised = this.authorised;
	data.scoringEnabled = this.ring && this.ring.scoringEnabled;
	data.canUndo = this.scores.length > 0;
	data.jpConnected = this.ring && this.ring.juryPresident && this.ring.juryPresident.connected;
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', data);
};

CornerJudge.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Jury President know that Corner Judge is disconnected/reconnected
		this.ring.cjConnectionStateChanged(this, this.connected);
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
