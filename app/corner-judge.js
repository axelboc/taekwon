
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('cj');
var util = require('./lib/util');
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
	this.undoEnabled = false;
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
	parent.initSpark.call(this, spark, INBOUND_SPARK_EVENTS);
};

/**
 * Return a simplified object representation of the Corner Judge.
 * @return {Array}
 */
CornerJudge.prototype.getState = function () {
	return {
		id: this.id,
		name: this.name,
		authorised: this.authorised,
		connected: this.connected
	};
};

/**
 * Get backdrop state and content based on Jury President connection state and Ring scoring state.
 * @param {Boolean} scoringEnabled
 * @param {Boolean} jpConnected
 * @return {Object}
 */
CornerJudge.prototype._getBackdropState = function (scoringEnabled, jpConnected) {
	var text = '';
	var subtext = '';
	
	if (!this.isJPConnected) {
		text = "Jury President disconnected";
		subtext = "Waiting for reconnection...";
	} else if (!this.isScoringEnabled) {
		text = "Please wait for round to begin";
		subtext = "... or timeout to end";
	}
	
	return {
		visible: !this.isJPConnected || !this.isScoringEnabled,
		text: text,
		subtext: subtext
	};
};


/* ==================================================
 * Inbound spark events:
 * - assert spark event data
 * - propagate to Tournament and Ring via events
 * ================================================== */

/**
 * Join a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
CornerJudge.prototype._onJoinRing = function (data) {
	assert.object(data, 'data');
	assert.integerGte0(data.index, 'data.index');
	
	logger.debug("Joining ring #" + (data.index + 1) + "...");
	this.emit('joinRing', this, data.index);
};

/**
 * Score.
 * @param {Object} data
 * 		  {String} data.competitor - the competitor who scored, as a non-empty string
 * 		  {Number} data.points - the number of points to score, as an integer greater than 0
 */
CornerJudge.prototype._onScore = function (data) {
	assert.object(data, 'data');
	assert.string(data.competitor, 'data.competitor');
	assert.integerGt0(data.points, 'data.points');
	
	this.emit('score', this, util.createScoreObject(data.competitor, data.points));
};

/**
 * Undo the latest score.
 */
CornerJudge.prototype._onUndo = function () {
	// Fail silently if there's no score to undo 
	if (this.scores.length === 0) {
		logger.error("No score to undo");
		return;
	}
	
	// Undo the latest score
	this.emit('undo', this, this.scores.pop());
};


/* ==================================================
 * Outbound spark events
 * ================================================== */

/**
 * Waiting for authorisation to join the ring.
 * @param {Ring} ring
 */
CornerJudge.prototype.waitingForAuthorisation = function (ring) {
	assert.provided(ring, 'ring');
	
	this.ring = ring;
	this._send('root.showView', { view: 'authorisationView' });
};

/**
 * The Corner Judge's request to join a ring has been rejected. Potential causes:
 * - rejected by Jury President,
 * - ring full.
 * @param {String} message
 * @param {Array} ringStates
 */
CornerJudge.prototype.rejected = function (message, ringStates) {
	assert.string(message, 'message');
	assert.array(ringStates, 'ringStates');
	assert.ok(!this.authorised, "already authorised");
	logger.debug("> " + message);

	this.ring = null;
	this._send('root.showView', { view: 'ringListView' });
	this._send('ringListView.setInstr', { text: message });
	this._send('ringListView.updateList', { rings: ringStates });
};

/**
 * The Jury President has authorised the Corner Judge's request to join the ring.
 */
CornerJudge.prototype.ringJoined = function () {
	assert.ok(this.ring, "not in a ring");
	
	// Mark the Corner Judge as authorised
	this.authorised = true;

	this._send('root.showView', { view: 'roundView' });
	this._send('io.setPageTitle', {
		title: "Corner Judge | Ring " + (this.ring.index + 1)
	};
	
	var backdropState = this._getBackdropState(this.ring.scoringEnabled, this.ring.juryPresident.connected);
	this._send('backdrop.update', backdropState);

	logger.info('ringJoined', {
		id: this.id,
		name: this.name,
		ringNumber: this.ring.number
	});
};

/**
 * The Corner Judge has left the ring, either voluntarily or by force:
 * - The Jury President has rejected the Corner Judge's request to join the ring.
 * - The Jury President has removed the Corner Judge from the ring.
 * @param {String} message - an explanation intended to be displayed to the human user
 * @param {Array} ringStates
 */
CornerJudge.prototype.ringLeft = function (message, ringStates) {
	assert.string(message, 'message');
	assert.array(ringStates, 'ringStates');
	assert.ok(this.ring, "not in a ring");
	var ringNumber = this.ring.number;

	// Remove the Corner Judge from the ring and mark it as unauthorised
	this.ring = null;
	this.authorised = false;

	this._send('io.setPageTitle', { title: "Corner Judge" });
	this._send('root.showView', { view: 'ringListView' });
	this._send('ringListView.setInstr', { text: message });
	this._send('ringListView.updateList', { rings: ringStates });

	logger.info('ringLeft', {
		id: this.id,
		name: this.name,
		ringNumber: ringNumber
	});
};

/**
 * The scoring state of the Ring has changed.
 * @param {Boolean} enabled - `true` if scoring is now enabled; `false` if it is disabled
 */
CornerJudge.prototype.scoringStateChanged = function (enabled) {
	assert.boolean(enabled, 'enabled');
	
	var backdropState = this._getBackdropState(enabled, this.ring.juryPresident.connected);
	this._send('backdrop.update', backdropState);
};

/**
 * The Corner Judge has scored.
 * @param {Object} score
 */
CornerJudge.prototype.scored = function (score) {
	assert.provided(score, 'score');
	logger.debug("Scored " + score.points + " for " + score.competitor);
	
	// Store the score so it can be undone
	this.scores.push(score);
	this._send('roundView.showFdb', {
		score: score,
		isUndo: false
	});

	if (this.scores.length === 1){
		// Enable the undo feature
		this.undoEnabled = true;
		this._send('roundView.enableUndoBtn', { enable: true });
	}
};

/**
 * The Corner Judge has undone a previous score.
 * @param {Object} score
 */
CornerJudge.prototype.undid = function (score) {
	assert.provided(score, 'score');
	logger.debug("Undid score of " + score.points + " for " + score.competitor);
	
	this._send('roundView.showFdb', {
		score: score,
		isUndo: true
	});

	if (this.scores.length === 0) {
		// Disable the undo feature
		this.undoEnabled = false;
		this._send('roundView.enableUndoBtn', { enable: false });
	}
};

/**
 * The connection state of the Jury President has changed.
 * @param {Boolean} connected
 */
CornerJudge.prototype.jpConnectionStateChanged = function (connected) {
	assert.boolean(connected, 'connected');
	
	var backdropState = this._getBackdropState(this.ring.scoringEnabled, connected);
	this._send('backdrop.update', backdropState);
};


exports.CornerJudge = CornerJudge;
