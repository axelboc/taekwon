
// Modules
var assert = require('assert');
var util = require('util');
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
 * Register event handlers on the spark.
 * @param {Spark} spark
 */
CornerJudge.prototype.initSpark = function (spark) {
	// Call parent function
	parent.initSpark.call(this, spark, ['joinRing', 'score', 'undo']);
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


/*
 * ==================================================
 * Inbound spark events:
 * - propagate to Ring via direct function calls
 * - acknowledge if required
 * ==================================================
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
	assert(!this.ring, "already in a ring");
	
	// Retrieve the ring at the given index
	var ring = this.tournament.getRing(data.index);
	this._debug("Joining ring #" + (data.index + 1) + "...");
	
	// Join the ring
	this.ring = ring;
	ring.addCJ(this);
	
	// Acknowledge that the authorisation to join the ring has been requested from the Jury President
	this.spark.emit('waitingForAuthorisation', data.index);
};

/**
 * Score.
 * @param {Object} data
 * 		  {Number} data.points - the number of points to score, as an integer greater than 0
 * 		  {String} data.competitor - the competitor who scored, as a non-empty string
 */
CornerJudge.prototype._onScore = function (data) {
	assert(typeof data === 'object' && data, "argument 'data' must be an object");
	assert(typeof data.points === 'number' && data.points > 0 && data.points % 1 === 0,
		   "'data.points' must be an integer greater than 0");
	assert(typeof data.competitor === 'string' && data.competitor.length > 0,
		   "'data.competitor' must be a non-empty string");
	assert(this.ring, "not in a ring");
	assert(this.authorised, "not authorised");
	
	this.ring.cjScored(this, data);
	this._debug("Scored " + data.points + " for " + data.competitor);
	
	// Acknowledge that the score has been processed
	this.spark.emit('scoreConfirmed', data);
	
	// Store the score so it can be undone
	this.scores.push(data);
	
	// When relevant, notify the client that the undo feature can be used
	if (this.scores.length === 1){
		this.spark.emit('canUndo', true);
	}
};

/**
 * Undo the latest score.
 */
CornerJudge.prototype._onUndo = function () {
	assert(this.ring, "not in a ring");
	assert(this.authorised, "not authorised");
	
	// Fail silently if there's no score to undo 
	if (this.scores.length === 0) {
		this._debug("Error: nothing to undo");
		return;
	}
	
	// Retrieve the latest score
	var score = this.scores.pop();

	// Treat like a normal score, but with a negative points value
	score.points *= -1;
	this.ring.cjScored(this, score);
	this._debug("Undid score of " + score.points + " for " + score.competitor);
	
	// Acknowledge that the score has been undone
	this.spark.emit('undoConfirmed', score);

	// When relevant, notify the client that the undo feature can no longer be used
	if (this.scores.length === 0) {
		this.spark.emit('canUndo', false);
	}
};


/*
 * ==================================================
 * Outbound spark events:
 * - received from Ring via direct function calls
 * ==================================================
 */

/**
 * The Jury President has authorised the Corner Judge's request to join the ring.
 */
CornerJudge.prototype.ringJoined = function () {
	assert(this.ring, "not in a ring");
	this._debug("> Ring joined");
	
	// Mark the Corner Judge as authorised
	this.authorised = true;
	
	this.spark.emit('ringJoined', {
		ringIndex: this.ring.index,
		scoringEnabled: this.ring.scoringEnabled,
		jpConnected: this.ring.juryPresident.connected
	});
};

/**
 * The Corner Judge has left the ring, either voluntarily or by force:
 * - The Jury President has rejected the Corner Judge's request to join the ring.
 * - The Jury President has removed the Corner Judge from the ring.
 * @param {String} message - an explanation intended to be displayed to the human user
 */
CornerJudge.prototype.ringLeft = function (message) {
	assert(typeof message === 'string' && message.length > 0, "argument 'message' must be a non-empty string");
	assert(this.ring, "not in a ring");
	this._debug("> Ring left: " + message);
	
	// Remove the Corner Judge from the ring and mark it as unauthorised
	this.ring = null;
	this.authorised = false;
	
	this.spark.emit('ringLeft', {
		message: message
	});
};

/**
 * The scoring state of the Ring has changed.
 * @param {Boolean} enabled - `true` if scoring is now enabled; `false` if it is disabled
 */
CornerJudge.prototype.scoringStateChanged = function (enabled) {
	assert(typeof enabled === 'boolean', "argument 'enabled' must be a boolean");
	assert(this.ring, "not in a ring");
	
	this.spark.emit('scoringStateChanged', enabled);
};

/**
 * The connection state of the Jury President has changed.
 * @param {Boolean} connected - `true` if the Jury President is now connected; `false` if it is disconnected
 */
CornerJudge.prototype.jpConnectionStateChanged = function (connected) {
	assert(typeof connected === 'boolean', "argument 'connected' must be a boolean");
	assert(this.ring, "not in a ring");
		
	this.spark.emit('jpConnectionStateChanged', connected);
};


exports.CornerJudge = CornerJudge;
