
// Modules
var assert = require('assert');
var util = require('util');
var config = require('./config');
var User = require('./user').User;


/**
 * Corner Judge.
 * @param {Tournament} tournament
 * @param {Primus} primus
 * @param {Spark} spark
 * @param {String} sessionId
 */
function CornerJudge(tournament, primus, spark, sessionId, name) {
	assert(typeof name === 'string' && name.length > 0, "argument 'name' must be a non-empty string");
	
	// Call parent constructor, which will assert the rest of the arguments
	User.apply(this, arguments);
	
	this.name = name;
	this.authorised = false;
	
	// Store scores for undo feature
	this.scores = [];
}

// Inherit from User
util.inherits(CornerJudge, User);
// Keep a pointer to the parent prototype
parent = CornerJudge.super_.prototype;


/**
 * Get basic information about the Corner Judge (ID and name).
 * @return {Object}
 */
CornerJudge.prototype.getInfo = function () {
	return {
		id: this.id,
		name: this.name
	};
};

/**
 * Register event handlers on the spark.
 * @param {Spark} spark
 */
CornerJudge.prototype.initSpark = function (spark) {
	// Call parent function
	parent.initSpark.call(this, spark, ['joinRing', 'score', 'undo']);
};


/*
 * ==============================
 * Inbound spark events
 * ==============================
 */

/**
 * Join a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
CornerJudge.prototype._onJoinRing = function (data) {
	assert(typeof data === 'object' && data, "argument 'data' must be an object");
	assert(typeof data.index === 'number' && data.index >= 0 && data.index % 1 === 0, 
		   "'data.index' must be a positive integer");
	
	// Retrieve the ring at the given index
	var ring = this.tournament.getRing(data.index);
	this._debug("Joining ring #" + (data.index + 1));
	
	// Join the ring
	ring.addCJ(this);
	this.ring = ring;
	
	// Acknowledge that the ring has been joined
	this.spark.emit('waitingForAuthorisation', data.index);
};

CornerJudge.prototype._onScore = function (score) {
	// TODO: throw when an unauthorised or disconnected judge scores/undoes a score
	if (this.ring) {
		this._debug("Scoring " + score.points + " for " + score.competitor);
		this.ring.cjScored(this, score, this.scoreConfirmed.bind(this, score));
	} else {
		this._debug("Error: Corner Judge hasn't joined a ring.");
	}
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
