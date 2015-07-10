'use strict';

// Dependencies
var EventEmitter = require('events').EventEmitter;
var StateMachine = require('javascript-state-machine');

var assert = require('./lib/assert');
var logger = require('./lib/log')('match');
var util = require('./lib/util');
var DB = require('./lib/db');
var Scoreboard = require('./scoreboard').Scoreboard;

var States = require('./enum/match-states');
var Transitions = require('./enum/match-transitions');
var Rounds = require('./enum/match-rounds');
var Competitors = require('./enum/competitors');


/**
 * Match.
 * @param {String} id
 * @param {Object} config
 * @param {String} state
 * @param {Object} data - additional state data
 */
function Match(id, config, state, data) {
	assert.string(id, 'id');
	assert.object(config, 'config');
	assert.string(state, 'state');
	assert.object(data, 'data');
	
	this.id = id;
	this.config = config;
	
	/**
	 * Columns in the scoreboards and penalties array.
	 * A column is added for each non-break state during the match, as well as when 
	 * computing the total scores of previous rounds.
	 * Examples of column ID sequences for various matches:
	 * - 1-round match: 		main, total-1
	 * - 2-round match: 		main, total-2
	 * - up to golden point: 	main, total-2, tie-breaker, total-4, golden point, total-6
	 */
	this.scoreboardColumns = data.scoreboardColumns || [];
	// The latest scoreboard column created
	this.scoreboardColumnId = data.scoreboardColumnId || null;
	
	// Scoreboard of each Corner Judge that was in the ring at some point during the match.
	this.scoreboards = data.scoreboards || {};

	// Penalties ('warnings' and 'fouls') for each scoreboard column (except break states).
	// Total maluses are stored against 'total' columns (as negative integers).
	this.penalties = data.penalties || {};
	
	// The winner of the match
	this.winner = data.winner || null;
	
	
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
	
	
	/* ==================================================
	 * Match state machine
	 * ================================================== */
	
	// Create state machine
	this.state = StateMachine.create({
		initial: { state: state, event: 'init', defer: true },
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
	this.state['on' + States.BREAK_ENDED] = this._onBreakEnded.bind(this);
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
	// This happens when a judge leaves the ring and re-joins it,
	// as scoreboards are kept for the whole duration of a match.
	if (!this.scoreboards[cj.id]) {
		this.scoreboards[cj.id] = new Scoreboard(cj.name);
	}
};

/**
 * The state machine has entered a new state.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onEnterState = function (transition, from, to) {
	// Emit event synchronously to avoid race conditions
	this.emit('stateChanged', transition, from, to);
	
	// Update database
	DB.setMatchState(this.id, to, {
		round: this.round.current,
		scoreboardColumns: this.scoreboardColumns,
		scoreboardColumnId: this.scoreboardColumnId,
		scoreboards: this.scoreboards,
		penalties: this.penalties,
		winner: this.winner
	});
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
			// Otherwise, compute winner
			this.winner = this._computeWinner(this._computeTotals());

			// If winner, end match
			if (this.winner || this.round.is(Rounds.GOLDEN_POINT)) {
				this.state.end();
			} else {
				this.state.results();
			}
		}
	}.bind(this), 0);
};

/**
 * A break has ended.
 */
Match.prototype._onBreakEnded = function () {
	// Decide what to do on the next tick
	setTimeout(function () {
		// Always continue to the next round after a break
		this.round.next();
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
	if (to !== Rounds.ROUND_2) {
		// Unless round 2, prepare the next column of the judges' scoreboards
		this.scoreboardColumnId = to === Rounds.ROUND_1 ? 'main' : to;
		this.scoreboardColumns.push(this.scoreboardColumnId);

		// Initialise penalty objects for new state
		this.penalties[this.scoreboardColumnId] = {
			warnings: {
				hong: 0,
				chong: 0
			},
			fouls: {
				hong: 0,
				chong: 0
			}
		};
	}
};

/**
 * Get the current scores of a Corner Judge.
 * Initialise a new score object if one doesn't already exist.
 * @param {String} cjId
 * @return {Object}
 */
Match.prototype.getCurentScores = function (cjId) {
	assert.string(cjId, 'cjId');
	return this.scoreboards[cjId].getColumn(this.scoreboardColumnId);
};

/**
 * A Corner Judge has scored.
 * @param {String} cjId
 * @param {Object} score
 */
Match.prototype.score = function (cjId, score) {
	// Ensure that the match is in the correct state to allow scoring
	assert.ok(this.state.is(States.ROUND_STARTED), 
			  "scoring not allowed in current match state: " + this.state.current);
	
	assert.string(cjId, 'cjId');
	assert.string(score.competitor, 'score.competitor');
	assert.integer(score.points, 'score.points');
	
	// Record the new score
	this.scoreboards[cjId].markScore(this.scoreboardColumnId, score.competitor, score.points);
	this.emit('scoresUpdated');
};

/**
 * Get the penalties for the current round.
 * @return {Object}
 */
Match.prototype.getRoundPenalties = function () {
	return this.penalties[this.scoreboardColumnId];
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
	// Ensure that the match is in the correct state to allow manipulating penalties
	assert.ok(this.state.is(States.ROUND_STARTED) || this.state.is(States.INJURY), 
			  "manipulating penalties not allowed in current match state: " + this.state.current);
	
	assert.string(type, 'type');
	assert.string(competitor, 'competitor');
	assert.ok(value === 1 || value === -1, "`value` must be 1 or -1");
	
	var penalty = this.penalties[this.scoreboardColumnId][type];
	assert.object(penalty, 'penalty');
	
	// Ensure that the new value is greater than or equal to zero
	var newValue = penalty[competitor] + value;
	assert.ok(newValue >= 0, "cannot decrement penalty (cannot be negative)");
	
	// Change penalty value and emit event
	penalty[competitor]  = newValue;
	this.emit('penaltiesUpdated', this.getRoundPenalties());
};

/**
 * Compute the winner for the last round(s).
 * @return {String} - the winner of the round(s), or null if it's a tie
 */
Match.prototype._computeWinner = function (totalColumnId) {
	var diff = 0;
	var ties = 0;

	var cjIds = Object.keys(this.scoreboards);
	
	// Compute each scoreboard's winner
	cjIds.forEach(function (cjId) {
		var winner = this.scoreboards[cjId].computeWinner(totalColumnId);

		// +1 if hong wins, -1 if chong wins, 0 if tie (null)
		diff += winner === Competitors.HONG ? 1 : (winner === Competitors.CHONG ? -1 : 0);
		ties += (!winner ? 1 : 0);
	}, this);

	// If majority of ties, match is also a tie
	if (cjIds.length > 2 && ties > Math.floor(cjIds.length % 2)) {
		return null;
	} else {
		// If diff is positive, hong wins; if it's negative, chong wins; otherwise, it's a tie
		return (diff > 0 ? Competitors.HONG : (diff < 0 ? Competitors.CHONG : null));
	}
};

/**
 * Compute the total scores of each Corner Judge and the total maluses for the last round(s).
 * @return {String} - the ID of the new total column
 */
Match.prototype._computeTotals = function () {
	// Create a unique ID for the new total column
	var totalColumnId = 'total-' + this.scoreboardColumns.length;
	this.scoreboardColumns.push(totalColumnId);

	// Compute total maluses in penalties object
	var maluses = this._computeMaluses(this.scoreboardColumnId);
	this.penalties[totalColumnId] = maluses;

	// Compute the new total column in each scoreboard
	Object.keys(this.scoreboards).forEach(function (cjId) {
		this.scoreboards[cjId].computeTotalColumn(this.scoreboardColumnId, totalColumnId, maluses);
	}, this);

	return totalColumnId;
};

/**
 * Compute maluses from one or more scoreboard columns' penalties, knowing that:
 * - 3 warnings = 1 foul = -1 pt
 */
Match.prototype._computeMaluses = function (columnId) {
	var penalties = this.penalties[columnId];
	return {
		hong: - Math.floor(penalties.warnings.hong / 3) - penalties.fouls.hong,
		chong: - Math.floor(penalties.warnings.chong / 3) - penalties.fouls.chong,
	};
};

module.exports.Match = Match;
