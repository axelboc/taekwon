
// Dependencies
var assert = require('./lib/assert');
var logger = require('./lib/log')('match');
var util = require('./lib/util');
var DB = require('./lib/db');

var EventEmitter = require('events').EventEmitter;
var StateMachine = require('javascript-state-machine');

var States = require('./enum/match-states');
var Rounds = require('./enum/match-rounds');
var Competitors = require('./enum/competitors');


/**
 * Match.
 * @param {String} id
 */
function Match(id, config) {
	assert.string(id, 'id');
	assert.object(config, 'config');
	
	this.id = id;
	this.config = config;
	
	// Create match state machine
	this.state = StateMachine.create({
		events: [
			{ name: 'begin', from: 'none', to: States.ROUND_IDLE },
			{ name: 'startState', from: States.ROUND_IDLE, to: States.ROUND_STARTED },
			{ name: 'startState', from: States.BREAK_IDLE, to: States.BREAK_STARTED },
			{ name: 'endState', from: States.ROUND_STARTED, to: States.ROUND_ENDED },
			{ name: 'endState', from: States.BREAK_STARTED, to: States.BREAK_ENDED },
			{ name: 'startEndInjury', from: States.ROUND_STARTED, to: States.INJURY },
			{ name: 'startEndInjury', from: States.INJURY, to: States.ROUND_STARTED },
			{ name: 'nextRound', from: States.BREAK_ENDED, to: States.ROUND_IDLE },
			{ name: 'break', from: [States.ROUND_ENDED, States.RESULTS], to: States.BREAK_IDLE },
			{ name: 'results', from: States.ROUND_ENDED, to: States.RESULTS },
			{ name: 'end', from: [States.ROUND_ENDED, States.RESULTS], to: States.MATCH_ENDED }
		],
		callbacks: {
			// Generic callbacks
			onleavestate: this._onLeaveState.bind(this),
			// Transition-based callbacks
			onbegin: this._onBegin.bind(this),
			onend: this._onEnd.bind(this)
		}
	});
	
	// State-based callbacks
	this.state['on' + States.ROUND_IDLE] = this._onRoundIdle.bind(this);
	this.state['on' + States.ROUND_ENDED] = this._onRoundEnded.bind(this);
	this.state['on' + States.BREAK_IDLE] = this._onBreakIdle.bind(this);
	this.state['on' + States.BREAK_ENDED] = this._onBreakEnded.bind(this);
	
	// Prepare round state machine transitions based on number of rounds
	var roundTransitions = [
		{ name: 'next', from: Rounds.ROUND_1, to: config.twoRounds ? Rounds.ROUND_2 : Rounds.TIE_BREAKER },
		{ name: 'next', from: Rounds.ROUND_2, to: Rounds.TIE_BREAKER },
		{ name: 'next', from: Rounds.TIE_BREAKER, to: Rounds.GOLDEN_POINT }
	];
	
	if (!config.twoRounds) {
		roundTransitions.splice(1, 1);
	}
	
	// Create round state machine
	this.round = StateMachine.create({
		initial: Rounds.ROUND_1,
		events: roundTransitions,
		callbacks: {
			onleavestate: this._onLeaveRound.bind(this)
		}
	});
	
	/**
	 * Columns in the scoreboards and penalties array.
	 * A column is added for each non-break state during the match, as well as when 
	 * computing the total scores of previous rounds.
	 * Examples of column ID sequences for various matches:
	 * - 1-round match: 		main, total-1
	 * - 2-round match: 		main, total-2
	 * - up to golden point: 	main, total-2, tie-breaker, total-4, golden point, total-6
	 */
	this.scoreboardColumns = [];
	// The latest scoreboard column created
	this.scoreboardColumnId;
	
	/**
	 * Scoreboard and name of each Corner Judge.
	 */
	this.scoreboards = {};
	this.cjNames = {};

	/**
	 * Penalties ('warnings' and 'fouls') for each scoreboard column (except break states).
	 * Total maluses are stored against 'total' columns (as negative integers).
	 */
	this.penalties = {};
	
	/**
	 * The winner of the match.
	 */
	this.winner = null;
}

// Inherit EventEmitter
util.inherits(Match, EventEmitter);


/**
 * The state machine is transitioning to a new state.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onLeaveState = function (transition, from, to) {
	logger.debug('state transition: ' + transition + ', from: ' + from + ', to: ' + to);
	
	// Update database
	DB.setMatchState(this.id, to, function () {
		// Transition state machine
		this.state.transition();
		
		// Emit event
		this.emit('stateChanged', to);
	}.bind(this));
	
	// Pause state machine until database call has completed
	return StateMachine.ASYNC;
};

/**
 * The round state machine is transitioning to a new round.
 * @param {String} transition
 * @param {String} from
 * @param {String} to
 */
Match.prototype._onLeaveRound = function (transition, from, to) {
	logger.debug('round transition: ' + transition + ', from: ' + from + ', to: ' + to);
	
	// Update database
	DB.setMatchRound(this.id, to, function () {
		// Transition round state machine
		this.round.transition();
		
		// Emit event
		this.emit('roundChanged', this.round.current);
	}.bind(this));
	
	// Pause round state machine until database call has completed
	return StateMachine.ASYNC;
};

/**
 * The match has begun.
 */
Match.prototype._onBegin = function () {
	this.emit('began');
	logger.info('began', {
		id: this.id
	});
};

/**
 * The match has ended.
 */
Match.prototype._onEnd = function () {
	this.emit('ended');
	logger.info('ended', {
		id: this.id
	});
};

/**
 * A round is about to start.
 */
Match.prototype._onRoundIdle = function () {
	if (!this.round.is(Rounds.ROUND_2)) {
		// Unless round 2, prepare the next column of the judges' scoreboards
		this.scoreboardColumnId = this.round.is(Rounds.ROUND_1) ? 'main' : this.round.current;
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

		this.emit('scoresUpdated');
		this.emit('penaltiesReset');
	}
};

/**
 * A round has ended.
 */
Match.prototype._onRoundEnded = function () {
	if (this.round.is(Rounds.ROUND_1) && this.config.twoRounds) {
		// If round 1 and match is to have two rounds, trigger a break
		this.state.break();
	} else {
		// Otherwise, compute results
		this._computeResults();
		
		// If winner, end match
		if (this.winner || this.round.is(Rounds.GOLDEN_POINT)) {
			this.state.end();
		} else {
			this.state.results();
		}
	}
};

/**
 * A break is about to start
 */
Match.prototype._onBreakIdle = function () {
	this.emit('roundChanged', 'Break');
	this.emit('continued');
};

/**
 * A break has ended.
 */
Match.prototype._onBreakEnded = function () {
	// Always continue to the next round after a break
	this.round.next();
	this.state.nextRound();
};

/**
 * Get the scoreboard of a judge.
 * Initialise the scoreboard if it doesn't already exist.
 * @param {String} cjId
 * @return {Object}
 */
Match.prototype._getScoreboard = function (cjId) {
	assert.string(cjId, 'cjId');
	
	if (!this.scoreboards[cjId]) {
		this.scoreboards[cjId] = {};
	}
	
	return this.scoreboards[cjId];
};

/**
 * Get the current scores of a Corner Judge.
 * Initialise a new score object if one doesn't already exist.
 * @param {String} cjId
 * @return {Object}
 */
Match.prototype.getScores = function (cjId) {
	assert.string(cjId, 'cjId');
	
	var scoreboard = this._getScoreboard(cjId);
	if (!scoreboard[this.scoreboardColumnId]) {
		scoreboard[this.scoreboardColumnId] = {
			hong: 0,
			chong: 0
		};
	}
	
	return scoreboard[this.scoreboardColumnId];
};

/**
 * Get the current penalties.
 * @return {Object}
 */
Match.prototype.getPenalties = function () {
	return this.penalties[this.scoreboardColumnId];
};

Match.prototype.incrementPenalty = function (type, competitor) {
	this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] += 1;
};

Match.prototype.decrementPenalty = function (type, competitor) {
	this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] -= 1;
};

Match.prototype.score = function (cjId, cjName, score) {
	// Ensure that the match is in the correct state to allow scoring
	assert.ok(this.state.is(States.ROUND_STARTED));
	
	assert.string(cjId, 'cjId');
	assert.string(score.competitor, 'score.competitor');
	assert.integer(score.points, 'score.points');
	
	// Store the name of the Corner Judge for future reference
	if (!this.cjNames[cjId]) {
		this.cjNames[cjId] = cjName;
	}
	
	// Record the new score
	this.getScores(cjId)[score.competitor] += score.points;
	this.emit('scoresUpdated');
};

/**
 * Compute the winner, maluses and total scores for the last round(s).
 */
Match.prototype._computeResults = function () {
	this.winner = this._computeWinner(this._computeTotals());
	this.emit('resultsComputed', this.winner);
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

	// Compute total scores in scorboard objects
	Object.keys(this.scoreboards).forEach(function (cjId) {
		// Retrieve the Corner Judge's scores for the latest round(s)
		var scores = this.getScores(cjId);
		
		// Sum scores and maluses (negative integers)
		this.scoreboards[cjId][totalColumnId] = {
			hong: scores.hong + maluses.hong,
			chong: scores.chong + maluses.chong
		};
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

/**
 * Compute the winner for the last round(s).
 * @return {String} - the winner of the round(s), or null if it's a tie
 */
Match.prototype._computeWinner = function (totalColumnId) {
	var diff = 0;
	var ties = 0;

	// Compute each Corner Judge's winner
	var cjIds = Object.keys(this.scoreboards);
	cjIds.forEach(function (cjId) {
		// Retrieve Corner Judge's totals
		var totals = this.scoreboards[cjId][totalColumnId];
		
		// Compute winner
		var winner = totals.hong > totals.chong ? Competitors.HONG : 
					 (totals.chong > totals.hong ? Competitors.CHONG : null);

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

exports.Match = Match;
