
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('cj');
var util = require('util');
var DB = require('./lib/db');
var User = require('./user').User;

var INBOUND_SPARK_EVENTS = ['joinRing', 'score', 'undo'];


/**
 * Corner Judge.
 * @param {String} id
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {Boolean} connected
 * @param {String} name
 * @param {Boolean} authorised
 */
function CornerJudge(id, spark, connected, name, authorised) {
	// Call parent constructor and assert arguments
	User.apply(this, arguments);
	assert.string(name, 'name');
	assert.boolean(authorised, 'authorised');
	
	this.name = name;
	this.authorised = authorised;
	
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
CornerJudge.prototype._initSpark = function (spark) {
	// Call parent function
	parent._initSpark.call(this, spark, INBOUND_SPARK_EVENTS);
};

/**
 * Restore the Corner Judge's session.
 * @param {Spark} spark - the spark of the new socket connection
 * @param {Array} ringStates
 */
CornerJudge.prototype.restoreSession = function (spark, ringStates) {
	assert.provided(spark, 'spark');
	assert.array(ringStates, 'ringStates');
	logger.debug("Restoring session...");

	// Initialise the new spark 
	this._initSpark(spark);
	
	// Prepare restoration data
	var data = {
		ringStates: ringStates,
		ringIndex: this.ring ? this.ring.index : -1,
		authorised: this.authorised,
		scoringEnabled: this.ring && this.ring.scoringEnabled,
		canUndo: this.scores.length > 0,
		jpConnected: this.ring && this.ring.juryPresident && this.ring.juryPresident.connected
	};
	
	// Send restore session event with all the required data
	this.spark.emit('restoreSession', data);
};


/*
 * ==================================================
 * Inbound spark events:
 * - assert spark event data
 * - propagate to Tournament and Ring via events
 * ==================================================
 */

/**
 * Join a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
CornerJudge.prototype._onJoinRing = function (data) {
	assert.object(data, 'data');
	assert.integerGte0(data.index, 'data.index');
	
	logger.debug("Joining ring #" + (data.index + 1) + "...");
	this.emit('joinRing', data.index);
};

/**
 * Score.
 * @param {Object} data
 * 		  {Number} data.points - the number of points to score, as an integer greater than 0
 * 		  {String} data.competitor - the competitor who scored, as a non-empty string
 */
CornerJudge.prototype._onScore = function (data) {
	assert.object(data, 'data');
	assert.integerGt0(data.points, 'data.points');
	assert.string(data.competitor, 'data.competitor');
	
	this.emit('score', this, data);
	logger.debug("Scored " + data.points + " for " + data.competitor);
	
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
	// Fail silently if there's no score to undo 
	if (this.scores.length === 0) {
		logger.debug("Nothing to undo");
		return;
	}
	
	// Retrieve the latest score
	var score = this.scores.pop();

	// Treat like a normal score, but with a negative points value
	score.points *= -1;
	this.emit('score', this, score);
	logger.debug("Undid score of " + score.points + " for " + score.competitor);
	
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
 * - functions called from Ring module
 * ==================================================
 */

/**
 * Waiting for authorisation to join the ring.
 * @param {Ring} ring
 */
CornerJudge.prototype.waitingForAuthorisation = function (ring) {
	assert.provided(ring, 'ring');
	
	this.ring = ring;
	this.spark.emit('waitingForAuthorisation');
};

/**
 * The Jury President has authorised the Corner Judge's request to join the ring.
 */
CornerJudge.prototype.ringJoined = function () {
	assert.ok(this.ring, "not in a ring");
	
	// Update the database
	DB.setCJAuthorised(this, function () {
		// Mark the Corner Judge as authorised
		this.authorised = true;

		this.spark.emit('ringJoined', {
			ringIndex: this.ring.index,
			scoringEnabled: this.ring.scoringEnabled,
			jpConnected: this.ring.juryPresident.connected
		});
		
		logger.info('ringJoined', {
			id: this.id,
			name: this.name,
			ringNumber: this.ring.number
		});
	}.bind(this));
};

/**
 * The Corner Judge has left the ring, either voluntarily or by force:
 * - The Jury President has rejected the Corner Judge's request to join the ring.
 * - The Jury President has removed the Corner Judge from the ring.
 * @param {String} message - an explanation intended to be displayed to the human user
 */
CornerJudge.prototype.ringLeft = function (message) {
	assert.string(message, 'message');
	assert.ok(this.ring, "not in a ring");
	
	// Update the database
	DB.setCJAuthorised(this, function () {
		// Remove the Corner Judge from the ring and mark it as unauthorised
		this.ring = null;
		this.authorised = false;

		this.spark.emit('ringLeft', {
			message: message
		});
		
		logger.info('ringLeft', {
			id: this.id,
			name: this.name,
			ringNumber: this.ring.number
		});
	}.bind(this));
};

/**
 * The scoring state of the Ring has changed.
 * @param {Boolean} enabled - `true` if scoring is now enabled; `false` if it is disabled
 */
CornerJudge.prototype.scoringStateChanged = function (enabled) {
	assert.boolean(enabled, 'enabled');
	this.spark.emit('scoringStateChanged', {
		enabled: enabled
	});
};

/**
 * The connection state of the Jury President has changed.
 * @param {JuryPresident} jp
 */
CornerJudge.prototype.jpConnectionStateChanged = function (jp) {
	assert.provided(jp, 'jp');
	this.spark.emit('jpConnectionStateChanged', {
		connected: jp.connected
	});
};


exports.CornerJudge = CornerJudge;
