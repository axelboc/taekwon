'use strict';

// Dependencies
var EventEmitter = require('events').EventEmitter;
var StateMachine = require('javascript-state-machine');

var assert = require('./lib/assert');
var log = require('./lib/log');
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
	this.logger = log.createLogger('match', "Match", { id: id });
	
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
			{ name: Transitions.END, from: '*', to: States.MATCH_ENDED }
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
		initial: { state: (data.period || Periods.MAIN_ROUNDS), event: Transitions.INIT },
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
		initial: { state: (data.round || Rounds.ROUND_1), event: Transitions.INIT },
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
	
	// Log and emit event synchronously to avoid race conditions
	this.logger.info('stateChanged', to, {
		transition: transition,
		from: from,
		to: to
	});

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
			// Otherwise, compute the results for the current period
			this._computeResults();

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
 * @param {String} transition
 */
Match.prototype._onBreakIdle = function (transition) {
	// Transition to the next round
	if (transition !== Transitions.INIT) {
		this.round.next();
	}
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
	
	this.logger.info('roundChanged', to, {
		transition: transition,
		from: from,
		to: to
	});
	
	// Start next period if entering tie breaker or golden point
	if (transition !== Transitions.INIT && !Rounds.isMainRound(to)) {
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
	if (transition === Transitions.INIT && this.periods.length > 0) {
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
	
	this.logger.info('periodChanged', to, {
		transition: transition,
		from: from,
		to: to
	});
};

/**
 * A Corner Judge has scored.
 * @param {String} cjId
 * @param {Object} score
 * @param {Boolean} `true` if score was processed as expected - `false` otherwise
 */
Match.prototype.score = function (cjId, score) {
	assert.string(cjId, 'cjId');
	assert.string(score.competitor, 'score.competitor');
	assert.integer(score.points, 'score.points');
	
	// Warn and return if scoring is not allowed in current match state
	if (!this.state.is(States.ROUND_STARTED)) {
		this.logger.warn('scoringNotAllowed', {
			state: this.state.current,
			cjId: cjId,
			score: score
		});

		return false;
	}

	// Find the judge's scoring sheet for the current period and mark the score
	var sheet = this.scoreboards[cjId].sheets[this.period.current];
	sheet.markScore(score.competitor, score.points);
	
	// Update database
	DB.setMatchState(this.id, { scoreboards: this.getScoreboardStates() });

	this.logger.info('score', {
		cjId: cjId,
		competitor: score.competitor,
		points: score.points
	});
	
	this.emit('scoreboardsUpdated');
	return true;
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
	
	this.logger.info('penaltiesUpdated', {
		type: type,
		competitor: competitor,
		value: value,
		newValue: newValue
	});
	
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
	
	// Log timer value every 30s
	if (value % 30 === 0) {
		this.logger.info(name + 'Timer', value, { value: value });
	}
};

/**
 * Compute the maluses, total scores and winner for the current period.
 */
Match.prototype._computeResults = function () {
	var cjIds = Object.keys(this.scoreboards);
	this._computeMaluses();
	this._computeTotals(cjIds);
	this._computeWinner(cjIds);

	// Update database
	DB.setMatchState(this.id, {
		scoreboards: this.getScoreboardStates(),
		maluses: this.maluses,
		winner: this.winner
	});
};

/**
 * Compute the maluses for the current period.
 */
Match.prototype._computeMaluses = function () {
	// Retrieve the penalties for the current period
	var penalties = this.penalties[this.period.current];
	
	// Compute each competitor's malus
	var maluses = [0, 1].map(function (index) {
		return 0 - Math.floor(penalties.warnings[index] / 3) - penalties.fouls[index];
	});
	
	// Store the maluses
	this.maluses[this.period.current] = maluses;
	this.logger.info('malusesComputed', { maluses: maluses });
};

/**
 * Compute the total scores for the current period in every scoring sheet.
 * @param {Array} cjIds
 */
Match.prototype._computeTotals = function (cjIds) {
	cjIds.forEach(function (cjId) {
		var sheet = this.scoreboards[cjId].sheets[this.period.current];
		var maluses = this.maluses[this.period.current];
		sheet.computeTotals(maluses);
	}, this);
};

/**
 * Compute the winner for the current period in every scoring sheet,
 * then compute the overall winner.
 * @param {Array} cjIds
 */
Match.prototype._computeWinner = function (cjIds) {
	var wins = { hong: 0, chong: 0 };
	var ties = 0;

	// Compute the totals for the current period in each scoreboard
	cjIds.forEach(function (cjId) {
		var sheet = this.scoreboards[cjId].sheets[this.period.current];
		sheet.computeWinner();
		
		if (sheet.winner) {
			// Increment the winner's win sum
			wins[sheet.winner] += 1;
		} else {
			// No winner, increment tie sum
			ties += 1;
		}
	}, this);
	
	this.winner = this._computeOverallWinner(wins.hong, wins.chong, ties);
	this.logger.info('winnerComputed', this.winner, { winner: this.winner });
};

Match.prototype._computeOverallWinner = function (winsHong, winsChong, ties) {
	// If majority of ties, match is also a tie (with 4 CJs, this is relevant only in the case of 3 ties + 1 win)
	if (ties > Math.max(winsHong, winsChong)) {
		return null;
	}
	
	// Determine winner
	return (winsHong > winsChong ? Competitors.HONG : (winsHong < winsChong ? Competitors.CHONG : null));
};

module.exports.Match = Match;
