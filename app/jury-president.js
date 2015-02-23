
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('jp');
var util = require('util');
var DB = require('./lib/db');
var User = require('./user').User;

var INBOUND_SPARK_EVENTS = ['openRing', 'addSlot', 'removeSlot', 'authoriseCJ', 'rejectCJ', 'removeCJ',
							'setConfigItem', 'createMatch', 'endMatch', 'enableScoring',
						    'startMatchState', 'endMatchState', 'startEndInjury'];


/**
 * Jury President.
 * @param {String} id
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {Boolean} connected
 */
function JuryPresident(id, spark, connected) {
	// Call parent constructor and assert arguments
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
	// Call parent function
	parent.initSpark.call(this, spark, INBOUND_SPARK_EVENTS);
};


/* ==================================================
 * Inbound spark events:
 * - assert spark event data
 * - propagate to Tournament and Ring via events
 * ================================================== */

/**
 * Open a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
JuryPresident.prototype._onOpenRing = function (data) {
	assert.object(data, 'data');
	assert.integerGte0(data.index, 'data.index');
	
	this.emit('openRing', this, data.index);
};

/**
 * Add a Corner Judge slot.
 */
JuryPresident.prototype._onAddSlot = function () {
	this.emit('addSlot');
};

/**
 * Remove a Corner Judge slot.
 */
JuryPresident.prototype._onRemoveSlot = function () {
	this.emit('removeSlot');
};

/**
 * Authorise a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to authorise
 */
JuryPresident.prototype._onAuthoriseCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('authoriseCJ', data.id);
	logger.debug("> Corner Judge authorised");
};

/**
 * Reject a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to reject
 */
JuryPresident.prototype._onRejectCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('rejectCJ', data.id);
};

/**
 * Remove a Corner Judge from the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to remove
 */
JuryPresident.prototype._onRemoveCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('removeCJ', data.id);
};

/**
 * Set the value of a match configuration item.
 * @param {Object} data
 * 		  {String} data.name - the name of the configuration item
 * 		  {Any} data.value - the new value
 */
JuryPresident.prototype._onSetConfigItem = function (data) {
	assert.object(data, 'data');
	assert.string(data.name, 'data.name');
	
	this.emit('setConfigItem', data.name, data.value);
};

/**
 * Create a new match.
 */
JuryPresident.prototype._onCreateMatch = function () {
	this.emit('createMatch');
};

/**
 * End the match.
 */
JuryPresident.prototype._onEndMatch = function () {
	this.emit('endMatch');
};

/**
 * Enable or disable scoring on the ring.
 * @param {Object}  data
 * 		  {Boolean} data.enable - `true` to enable; `false` to disable
 */
JuryPresident.prototype._onEnableScoring = function (data) {
	assert.object(data, 'data');
	assert.boolean(data.enable, 'data.enable');
	
	this.emit('enableScoring', data.enable);
};

/**
 * Start the current match state.
 */
JuryPresident.prototype._onStartMatchState = function () {
	this.emit('startMatchState');
};

/**
 * End the current match state.
 */
JuryPresident.prototype._onEndMatchState = function () {
	this.emit('endMatchState');
};

/**
 * Start or end an injury.
 */
JuryPresident.prototype._onStartEndInjury = function () {
	this.emit('startEndInjury');
};


/* ==================================================
 * Outbound spark events
 * ================================================== */

/**
 * The ring has been opened.
 * @param {Ring} ring
 * @param {Object} matchConfig
 * @param {Array} slots
 */
JuryPresident.prototype.ringOpened = function (ring, matchConfig, slots) {
	assert.provided(ring, 'ring');
	assert.object(matchConfig, 'matchConfig');
	assert.array(slots, 'slots');
	
	this.ring = ring;
	this._send('ringOpened', {
		index: ring.index
	});
	
	// Update configuration panel and judges sidebar
	this._updateWidget('configPanel', 'config', { config: matchConfig });
	this._updateWidget('judgesSidebar', 'slotList', { slots: slots });
};

/**
 * A Corner Judge slot has been added or removed from the ring.
 * @param {Array} slots
 * @param {Array} scoreSlots
 */
JuryPresident.prototype.slotsUpdated = function (slots, scoreSlots) {
	assert.array(slots, 'slots');
	assert.ok(scoreSlots === null || Array.isArray(scoreSlots), "`scoreSlots` must be either null or an array");
	
	// Update slots in judges sidebar and score slots in match panel
	this._updateWidget('judgesSidebar', 'slotList', { slots: slots });
	if (scoreSlots !== null) {
		this._updateWidget('matchPanel', 'scoreSlots', { scoreSlots: scoreSlots });
	}
};

/**
 * A Corner Judge slot could not be removed from the ring.
 * @param {String} reason - the reason for the error
 */
JuryPresident.prototype.slotNotRemoved = function (reason) {
	assert.string(reason, 'reason');
	
	this._send('slotNotRemoved', {
		reason: reason
	});
};

/**
 * A configuration item has been set.
 * @param {Object} matchConfig - the new match configuration for the ring
 */
JuryPresident.prototype.configItemSet = function (matchConfig) {
	assert.object(matchConfig, 'matchConfig');
	
	// Update configuration panel
	this._updateWidget('configPanel', 'config', { config: matchConfig });
};

/**
 * A new match has been created.
 * @param {Object} scoreSlots
 * @param {Boolean} scoringEnabled
 * @param {Object} penalties
 */
JuryPresident.prototype.matchCreated = function (scoreSlots, scoringEnabled, penalties) {
	assert.object(scoreSlots, 'scoreSlots');
	assert.boolean(scoringEnabled, 'scoringEnabled');
	assert.object(penalties, 'penalties');
	
	this._send('matchCreated');
	this._updateWidget('matchPanel', 'scoreSlots', { scoreSlots: scoreSlots });
	this._updateWidget('matchPanel', 'penalties', {
		scoringEnabled: scoringEnabled,
		penalties: penalties
	});
};

/*
 * The state of the match has changed.
 * @param {State} state
 */
JuryPresident.prototype.matchStateChanged = function (state) {
	assert.provided(state, 'state');
	
	this._send('matchStateChanged', {
		state: state
	});
	this._updateWidget('matchPanel', 'state', { state: state });
};

/**
 * The match has been ended.
 */
JuryPresident.prototype.matchEnded = function () {
	this._send('matchEnded');
};

/**
 * The scoring state has changed.
 */
JuryPresident.prototype.scoringStateChanged = function (enabled) {
	this._send('scoringStateChanged', {
		enabled: enabled
	});
};

/**
 * A Corner Judge has scored.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
JuryPresident.prototype.cjScored = function (cj, score) {
	assert.provided(cj, 'cj');
	assert.provided(score, 'score');
	
	this._send('cjScored', {
		id: cj.id,
		score: score
	});
};

/**
 * A Corner Judge has undone a previous score.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
JuryPresident.prototype.cjUndid = function (cj, score) {
	assert.provided(cj, 'cj');
	assert.provided(score, 'score');
	
	this._send('cjUndid', {
		id: cj.id,
		score: score
	});
};

/**
 * A Corner Judge has exited the system.
 * @param {CornerJudge} cj
 */
JuryPresident.prototype.cjExited = function (cj) {
	assert.provided(cj, 'cj');
	
	this._send('cjExited', {
		id: cj.id
	});
};


exports.JuryPresident = JuryPresident;
