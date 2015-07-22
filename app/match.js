'use strict';

// Dependencies
var EventEmitter = require('events').EventEmitter;
var StateMachine = require('javascript-state-machine');

var assert = require('./lib/assert');
var logger = require('./lib/log')('match');
var util = require('./lib/util');
var DB = require('./lib/db');
var ScoringSheet = require('./scoring-sheet').ScoringSheet;

var States = require('./enum/match-states');
var Transitions = require('./enum/match-transitions');
var Rounds = require('./enum/match-rounds');
var Periods = require('./enum/match-periods');
var Competitors = require('./enum/competitors');


/**
 * Match.
 * @param {String} id
 * @param {Object} config
 * @param {Object} data - state data
 * 		  {String} data.state
 */
function Match(id, config, data) {
	assert.string(id, 'id');
	assert.object(config, 'config');
	assert.object(data, 'data');
	assert.string(data.state, 'data.state');
	
	this.id = id;
	this.config = config;
	
	// Periods of the match
	this.periods = data.periods || [];
	
	// Scoreboard object of each Corner Judge who has joined the ring at some point during the match
	this.scoreboards = this._restoreScoreboards(data.scoreboards || {});
	
	// Penalties ('warnings' and 'fouls') for each period
	this.penalties = data.penalties || {};
	
	// Maluses for each period (calculated from the penalties at the end of a period)
	this.maluses = data.maluses || {};
	
	// Winner of the match
	this.winner = data.winner || null;
	
	// Timers
	this.timers = data.timers || {
		round: 0,
		injury: 0
	};
	
	
	/* ==================================================
	 * Match state machine
	 * ================================================== */
	
	// Create state machine
	this.state = StateMachine.create({
		initial: { state: data.state, event: Transitions.INIT, defer: true },
		events: [
			{ name: Transitions.START_STATE, from: States.ROUND_IDLE, to: States.ROUND_STARTED },
			{ name: Transitions.START_STATE, from: States.BREAK_IDLE, to: States.BREAK_STARTED },
			{ name: Transitions.END_STATE, from: States.ROUND_STARTED, to: States.ROUND_ENDED },
			{ name: Transitions.END_STATE, from: States.BREAK_STARTED, to: States.BREAK_ENDED },
			{ name: Transitions.START_END_INJURY, from: States.ROUND_STARTED, to: States.INJURY },
			{ name: Transitions.START_END_INJURY, from: States.INJURY, to: States.ROUND_STARTED },
			{ name: Transitions.NEXT_ROUND, from: States.BREAK_ENDED, to: States.ROUND_IDLE },
			{ name: Transitions.BREAK, from: [States.ROUND_ENDED, States.RESULTS], to: States.BREAK_IDLE },
			{ name: Transitions.RESULTS, from: States.ROUND_ENDED, to: States.RESULTS },
			{ name: Transitions.END, from: [States.ROUND_ENDED, States.RESULTS], to: States.MATCH_ENDED }
		],
		callbacks: {
			onenterstate: this._onEnterState.bind(this)
		}
	});
	
	// Register state-based callbacks
	this.state['on' + States.ROUND_ENDED] = this._onRoundEnded.bind(this);
	this.state['on' + States.BREAK_IDLE] = this._onBreakIdle.bind(this);
	this.state['on' + States.BREAK_ENDED] = this._onBreakEnded.bind(this);
	
	
	/* ==================================================
	 * Period state machine
	 * ================================================== */
	
	// Create state machine
	this.period = StateMachine.create({
		initial: data.period || Periods.MAIN_ROUNDS,
		events: [
			{ name: 'next', from: Periods.MAIN_ROUNDS, to: Periods.TIE_BREAKER },
			{ name: 'next', from: Periods.TIE_BREAKER, to: Periods.GOLDEN_POINT }
		],
		callbacks: {
			onenterstate: this._onEnterPeriod.bind(this)
		}
	});
	
	
	/* ==================================================
	 * Round state machine
	 * ================================================== */
	
	// Prepare transitions based on number of rounds
	var roundTransitions = [
		{ name: 'next', from: Rounds.ROUND_1, to: config.twoRounds ? Rounds.ROUND_2 : Rounds.TIE_BREAKER },
		{ name: 'next', from: Rounds.ROUND_2, to: Rounds.TIE_BREAKER },
		{ name: 'next', from: Rounds.TIE_BREAKER, to: Rounds.GOLDEN_POINT }
	];
	
	if (!config.twoRounds) {
		roundTransitions.splice(1, 1);
	}
	
	// Create state machine
	this.round = StateMachine.create({
		initial: data.round || Rounds.ROUND_1,
		events: roundTransitions,
		callbacks: {
			onenterstate: this._onEnterRound.bind(this)
		}
	});
}

// Inherit EventEmitter
util.inherits(Match, EventEmitter);


/**
 * Initialise a Corner Judge's scoreboard.
 * @param {CornerJudge} cj
 */
Match.prototype.initScoreboard = function (cj) {
	assert.provided(cj, 'cj');
	
	// Ignore if the Corner Judge already has a scoreboard.
	// This happens when a judge leaves the ring and re-joins it, as scoreboards are kept 
	// for the whole duration of a match.
	if (!this.scoreboards[cj.id]) {
		// Initialise a scoring sheet for the current period
		var sheets = [];
		sheets[this.period.current] = new ScoringSheet();
		
		// Initialise the judge's scoreboard object
		this.scoreboards[cj.id] = {
			cjName: cj.name,
			sheets: sheets
		};
	}
	
	// Update database
	DB.setMatchState(this.id, { scoreboards: this.getScoreboardStates() });
	
	this.emit('scoreboardsUpdated');
};

/**
 * Restore scoreboards.
 * @param {Object} data
 */
Match.prototype._restoreScoreboards = function (data) {
	assert.object(data, 'data');
	
	return Object.keys(data).reduce(function (scoreboards, cjId) {
		var scoreboard = data[cjId];
		
		// Replace the sheet objects with ScoringSheet instances
		scoreboard.sheets = Object.keys(scoreboard.sheets).reduce(function (sheets, period) {
			sheets[period] = new ScoringSheet(scoreboard.sheets[period]);
			return sheets;
		}, {});
		
		scoreboards[cjId] = scoreboard;
		return scoreboards;
	}, {});
};

/**
 * Return the state of each Corner Judge scoreboard.
 * @return {Array}
 */
Match.prototype.getScoreboardStates = function () {
	return Object.keys(this.scoreboards).reduce(function (scoreboards, cjId) {
		var scoreboard = this.scoreboards[cjId];
		
		// Get the state of the scoreboard's sheets
		var sheets = {};
		Object.keys(scoreboard.sheets).forEach(function (period) {
			var sheet = scoreboard.sheets[period];
			sheets[period] = {
				scores: sheet.scores,
				totals: sheet.totals,
				winner: sheet.winner
			};
		});
		
		scoreboards[cjId] = {
			cjName: scoreboard.cjName,
			sheets: sheets
		};
		
		return scoreboards;
	}.bind(this), {});
};

/**
 * Get the scoreboards for the current period.
 * @return {Array}
 */
Match.prototype.getCurrentScoreboards = function () {
	return Object.keys(this.scoreboards).map(function (cjId) {
		var scoreboard = this.scoreboards[cjId];
		return {
			cjName: scoreboard.cjName,
			scores: scoreboard.sheets[this.period.current].scores.slice(0)
		};
	}, this);
};

/**
 * Get the penalties for the current period.
 * @return {Object}
 */
Match.prototype.getCurrentPenalties = function () {
	return this.penalties[this.period.current];
};

/**
 * The state machine has entered a new state.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onEnterState = function (transition, from, to) {
	// Set value of timers when appropriate
	switch (to) {
		case States.ROUND_IDLE:
			this.timers.round = this.round.is(Rounds.GOLDEN_POINT) ? 0 : this.config.roundTime;
			break;
		case States.BREAK_IDLE:
			this.timers.round = this.config.breakTime;
			break;
		case States.INJURY:
			if (transition !== Transitions.INIT) {
				this.timers.injury = this.config.injuryTime;
			}
			break;
	}
	
	// Update database
	DB.setMatchState(this.id, {
		state: to,
		timers: this.timers
	});
	
	// Emit event synchronously to avoid race conditions
	this.emit('stateChanged', transition, from, to);
};

/**
 * A round has ended.
 */
Match.prototype._onRoundEnded = function () {
	// Decide what to do on the next tick
	setTimeout(function () {
		if (this.round.is(Rounds.ROUND_1) && this.config.twoRounds) {
			// If round 1 and match is to have two rounds, trigger a break
			this.state.break();
		} else {
			// Otherwise, compute the maluses, total scores and overall winner
			this._computeWinner();

			// If winner or end of Golden Point, end match; otherwise, show results
			if (this.winner || this.round.is(Rounds.GOLDEN_POINT)) {
				this.state.end();
			} else {
				this.state.results();
			}
		}
	}.bind(this), 0);
};

/**
 * A break is about to start.
 */
Match.prototype._onBreakIdle = function () {
	// Transition to the next round
	this.round.next();
};

/**
 * A break has ended.
 */
Match.prototype._onBreakEnded = function () {
	// Wait for the next tick before automatically transitioning to another state
	setTimeout(function () {
		// Always continue to the next round after a break
		this.state.nextRound();
	}.bind(this), 0);
};

/**
 * The round state machine has entered a new round.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onEnterRound = function (transition, from, to) {
	// Update database
	DB.setMatchState(this.id, { round: to });
	
	// Start next period if entering tie breaker or golden point
	if (transition !== 'startup' && !Rounds.isMainRound(to)) {
		this.period.next();
	}
};

/**
 * The period state machine has entered a new period.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onEnterPeriod = function (transition, from, to) {
	// If the match is being restored; return
	if (transition === 'startup' && this.periods.length > 0) {
		return;
	}
	
	this.periods.push(to);
	
	// Initialise a new scoring sheet in each scoreboard
	Object.keys(this.scoreboards).forEach(function (cjId) {
		this.scoreboards[cjId].sheets[to] = new ScoringSheet();
	}, this);
	
	// Initialise a new penalty object for the period
	this.penalties[to] = {
		warnings: [0, 0],
		fouls: [0, 0]
	};
	
	// Update database
	DB.setMatchState(this.id, {
		period: to,
		periods: this.periods,
		scoreboards: this.getScoreboardStates(),
		penalties: this.penalties
	});
};

/**
 * A Corner Judge has scored.
 * @param {String} cjId
 * @param {Object} score
 */
Match.prototype.score = function (cjId, score) {
	assert.string(cjId, 'cjId');
	assert.string(score.competitor, 'score.competitor');
	assert.integer(score.points, 'score.points');
	assert.ok(this.state.is(States.ROUND_STARTED), 
			  "scoring not allowed in current match state: " + this.state.current);
	
	// Find the judge's scoring sheet for the current period and mark the score
	var sheet = this.scoreboards[cjId].sheets[this.period.current];
	sheet.markScore(score.competitor, score.points);
	
	// Update database
	DB.setMatchState(this.id, { scoreboards: this.getScoreboardStates() });

	this.emit('scoreboardsUpdated');
};

/**
 * Increment a penalty.
 * @param {String} type - (warnings|fouls)
 * @param {String} competitor - (hong|chong)
 */
Match.prototype.incrementPenalty = function (type, competitor) {
	this._updatePenalty(type, competitor, 1);
};

/**
 * Decrement a penalty.
 * @param {String} type - (warnings|fouls)
 * @param {String} competitor - (hong|chong)
 */
Match.prototype.decrementPenalty = function (type, competitor) {
	this._updatePenalty(type, competitor, -1);
};

/**
 * Increment or decrement a penalty.
 * @param {String} type - (warnings|fouls)
 * @param {String} competitor - (hong|chong)
 * @param {String} value - (1|-1)
 */
Match.prototype._updatePenalty = function (type, competitor, value) {
	assert.string(type, 'type');
	assert.string(competitor, 'competitor');
	assert.ok(value === 1 || value === -1, "`value` must be 1 or -1");
	assert.ok(this.state.is(States.ROUND_STARTED) || this.state.is(States.INJURY), 
			  "manipulating penalties not allowed in current match state: " + this.state.current);
	
	// Retrieve the penalty array
	var penalty = this.penalties[this.period.current][type];
	var index = competitor === Competitors.HONG ? 0 : 1;
	
	// Ensure that the new value is greater than or equal to zero
	var newValue = penalty[index] + value;
	assert.ok(newValue >= 0, "cannot decrement penalty (cannot be negative)");
	
	// Change penalty value
	penalty[index] = newValue;
	
	// Update database
	DB.setMatchState(this.id, { penalties: this.penalties });
	
	this.emit('penaltiesUpdated');
};

/**
 * Save the value of a timer.
 * @param {String} name - the name of the timer
 * @param {Integer} value - the new value
 */
Match.prototype.saveTimerValue = function (name, value) {
	assert.string(name, 'name');
	assert.integerGte0(value, 'value');
	
	this.timers[name] = value;
	
	// Update database
	DB.setMatchState(this.id, { timers: this.timers });
};

/**
 * Compute the maluses, total scores and overall winner for the current period.
 */
Match.prototype._computeWinner = function () {
	// Retrieve the penalties for the current period
	var penalties = this.penalties[this.period.current];
	
	// Compute each competitor's malus
	var maluses = [0, 1].map(function (index) {
		return 0 - Math.floor(penalties.warnings[index] / 3) - penalties.fouls[index];
	});
	
	// Store the maluses
	this.maluses[this.period.current] = maluses;
	
	// Prepare to compute the totals and the overall winner
	var cjIds = Object.keys(this.scoreboards);
	var diff = 0;
	var ties = 0;

	// Compute the totals for the current period in each scoreboard
	cjIds.forEach(function (cjId) {
		var winner = this.scoreboards[cjId].sheets[this.period.current].computeTotals(maluses);
		
		// +1 if hong wins, -1 if chong wins, 0 if tie
		diff += winner === Competitors.HONG ? 1 : (winner === Competitors.CHONG ? -1 : 0);
		ties += !winner ? 1 : 0;
	}, this);
	
	// If majority of ties, match is also a tie
	if (cjIds.length > 2 && ties > Math.floor(cjIds.length % 2)) {
		this.winner = null;
	} else {
		// If diff is positive, hong wins; if it's negative, chong wins; otherwise, it's a tie
		this.winner = diff > 0 ? Competitors.HONG : (diff < 0 ? Competitors.CHONG : null);
	}
	
	// Update database
	DB.setMatchState(this.id, {
		scoreboards: this.getScoreboardStates(),
		maluses: this.maluses,
		winner: this.winner
	});
};

module.exports.Match = Match;
