
// Dependencies
var util = require('util');
var assert = require('./lib/assert');
var logger = require('./lib/log')('jp');
var DB = require('./lib/db');
var User = require('./user').User;
var MatchStates = require('./enum/match-states');
var MatchRounds = require('./enum/match-rounds');

var INBOUND_SPARK_EVENTS = [
	'selectRing', 'addSlot', 'removeSlot', 'authoriseCJ', 'rejectCJ', 'removeCJ',
	'configureMatch', 'setConfigItem', 'createMatch', 'continueMatch', 'endMatch',
	'startMatchState', 'endMatchState', 'startEndInjury'
];


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
 * Custom handlers for inbound spark events.
 * (By default, such events are forwarded with EventEmitter.)
 * ================================================== */

/**
 * Select a ring (i.e. open).
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
JuryPresident.prototype._onSelectRing = function (data) {
	assert.object(data, 'data');
	assert.integerGte0(data.index, 'data.index');
	
	this.emit('openRing', this, data.index);
};

/**
 * Configure the next match.
 */
JuryPresident.prototype._onConfigureMatch = function () {
	// Simply show the configuration panel
	this._send('ringView.showPanel', { panel: 'configPanel' });
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
	
	this._send('io.setPageTitle', {
		title: "Jury President | Ring " + (ring.index + 1)
	});
	
	// Update configuration panel and judges sidebar
	this._send('configPanel.updateConfig', { config: matchConfig });
	this._send('judgesSidebar.updateSlotList', { slots: slots });
	
	this._send('ringView.showPanel', { panel: 'configPanel' });
	this._send('root.showView', { view: 'ringView' });
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
	this._send('judgesSidebar.updateSlotList', { slots: slots });
	if (scoreSlots !== null) {
		this._send('matchPanel.updateScoreSlots', { scoreSlots: scoreSlots });
	}
};

/**
 * A Corner Judge slot could not be removed from the ring.
 * @param {String} reason - the reason for the error
 */
JuryPresident.prototype.slotNotRemoved = function (reason) {
	assert.string(reason, 'reason');
	this._send('io.alert', { reason: reason });
};

/**
 * A configuration item has been set.
 * @param {Object} matchConfig - the new match configuration for the ring
 */
JuryPresident.prototype.configItemSet = function (matchConfig) {
	assert.object(matchConfig, 'matchConfig');
	this._send('configPanel.updateConfig', { config: matchConfig });
};

/**
 * A new match has begun.
 * @param {Object} config
 * @param {Object} scoreSlots
 * @param {Object} penalties
 */
JuryPresident.prototype.matchBegan = function (config, scoreSlots, penalties) {
	assert.object(config, 'config');
	assert.object(scoreSlots, 'scoreSlots');
	assert.object(penalties, 'penalties');

	this._send('matchPanel.updateScoreSlots', { scoreSlots: scoreSlots });
	this._penaltiesUpdated(penalties, false);
	
	this._send('roundTimer.reset', { value: config.roundTime });
	this._send('ringView.showPanel', { panel: 'matchPanel' });
};

/**
 * The match has been continued.
 */
JuryPresident.prototype.matchContinued = function () {
	this._send('ringView.showPanel', { panel: 'matchPanel' });
};

/**
 * The match has been ended.
 */
JuryPresident.prototype.matchEnded = function () {
	this._send('roundTimer.stop');
	this._send('resultPanel.showEndBtns');
	this._send('ringView.showPanel', { panel: 'resultPanel' });
};

/*
 * The state of the match has changed.
 * @param {Object} config
 * @param {String} state
 * @param {String} round
 * @param {Object} penalties
 */
JuryPresident.prototype.matchStateChanged = function (config, state, round, penalties) {
	assert.object(config, 'config')
	assert.string(state, 'state');
	assert.string(round, 'round');
	assert.object(penalties, 'penalties');
	var isGoldenPoint =  round === MatchRounds.GOLDEN_POINT;
	
	switch (state) {
		case MatchStates.MATCH_ENDED:
			return;
			
		case MatchStates.RESULTS:
			this._send('resultPanel.showContinueBtns');
			this._send('ringView.showPanel', { panel: 'resultPanel' });
			return;
			
		case MatchStates.ROUND_IDLE:
			this._send('roundTimer.reset', {
				value: isGoldenPoint ? 0 : config.roundTime
			});
			break;
			
		case MatchStates.BREAK_IDLE:
			this._send('matchPanel.setRoundLabel', { label: 'Break' });
			this._send('roundTimer.reset', { value: config.breakTime });
			break;
			
		case MatchStates.ROUND_STARTED:
			this._penaltiesUpdated(penalties, true);
		case MatchStates.BREAK_STARTED:
			this._send('roundTimer.start', {
				countDown: !isGoldenPoint,
				delay: false
			});
			break;
			
		case MatchStates.ROUND_ENDED:
			this._send('matchPanel.disablePenaltyBtns');
		case MatchStates.BREAK_ENDED:
			this._send('roundTimer.stop');
			break;
	}
	
	this._send('matchPanel.updateState', {
		state: {
			isIdle: MatchStates.isIdle(state),
			isStarted: MatchStates.isStarted(state),
			isBreak: MatchStates.isBreak(state),
			isInjury: MatchStates.isInjury(state),
			enableInjuryBtn: state === MatchStates.ROUND_STARTED || MatchStates.isInjury(state)
		}
	});
};

/**
 * The round of a match has changed.
 * @param {String} round
 */
JuryPresident.prototype.matchRoundChanged = function (round) {
	assert.string(round, 'round');
	this._send('matchPanel.setRoundLabel', { label: round });
};

/**
 * An injury has started or ended.
 * @param {Object} config
 * @param {Boolean} started
 */
JuryPresident.prototype.injuryStateChanged = function (config, started) {
	assert.object(config, 'config')
	assert.boolean(started, 'started');
	
	if (started) {
		this._send('matchPanel.toggleInjuryTimer', { show: true });
		this._send('roundTimer.pause');
		this._send('injuryTimer.reset', { value: config.injuryTime });
		this._send('injuryTimer.start', {
			countDown: true,
			delay: true
		});
	} else {
		this._send('matchPanel.toggleInjuryTimer', { show: false });
		this._send('injuryTimer.stop');
		this._send('roundTimer.unpause', {
			delay: true
		});
	}
};

/**
 * The match's scores have been updated.
 * @param {Object} scoreSlots
 */
JuryPresident.prototype.matchScoresUpdated = function (scoreSlots) {
	assert.object(scoreSlots, 'scoreSlots');
	this._send('matchPanel.updateScoreSlots', { scoreSlots: scoreSlots });
};

/**
 * The penalties have been updated.
 * @param {Object} penalties
 * @param {Boolean} enable - whether the penalties can be changed in the current state of the match
 */
JuryPresident.prototype._penaltiesUpdated = function (penalties, enable) {
	assert.object(penalties, 'penalties');
	assert.boolean(enable, 'enable');
	
	// Add flags to `penalties` objects to indicate whether the values can be incremented and decremented
	Object.keys(penalties).forEach(function (key) {
		var p = penalties[key];
		p.allowIncHong = enable;
		p.allowDecHong = enable && p.hong > 0;
		p.allowIncChong = enable;
		p.allowDecChong = enable && p.chong > 0;
	});
	
	this._send('matchPanel.updatePenalties', {
		warnings: penalties['warnings'],
		fouls: penalties['fouls']
	});
};

/**
 * The results of a round have been computed.
 * @param {String} winner
 * @param {Object} config
 * @param {Array} scoreboardColumns
 * @param {Object} scoreboards
 * @param {Object} penalties
 * @param {Object} cjNames
 */
JuryPresident.prototype.matchResultsComputed = function (winner, config, scoreboardColumns, scoreboards,
														 penalties, cjNames) {
	assert.ok(winner === null || typeof winner === 'string' && winner.length > 0,
			  '`winner` must be null or a non-empty string');
	assert.object(config, 'config');
	assert.array(scoreboardColumns, 'scoreboardColumns');
	assert.object(scoreboards, 'scoreboards');
	assert.object(penalties, 'penalties');
	assert.object(cjNames, 'cjNames');
	
	this._send('resultPanel.setWinner', { winner: winner });
	this._send('resultPanel.updateScoreboard', {
		config: config,
		scoreboardColumns: scoreboardColumns,
		scoreboards: scoreboards,
		penalties: penalties,
		cjNames: cjNames
	});
};

/**
 * A Corner Judge has exited the system.
 * @param {CornerJudge} cj
 */
JuryPresident.prototype.cjExited = function (cj) {
	assert.provided(cj, 'cj');
};


exports.JuryPresident = JuryPresident;
