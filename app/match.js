
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('match');
var util = require('./lib/util');
var DB = require('./lib/db');
var EventEmitter = require('events').EventEmitter;
var States = require('./enum/states');
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
	
	this.state = null;
	this.states = [States.ROUND_1];
	this.stateIndex = -1;

	this.stateStarted = false;
	this.injuryStarted = false;
	
	this.winner = null;
	
	/**
	 * Columns in the scoreboards and penalties array.
	 * A column is added for each non-break state during the match, as well as when 
	 * computing the total scores of previous rounds.
	 * Examples of column ID sequences for various matches:
	 * - 1-round match: 		round-1, total-1
	 * - 2-round match: 		round-1, round-2, total-2
	 * - up to golden point: 	round-1, round-2, total-2, tie-breaker, total-4, golden point, total-6
	 */
	this.scoreboardColumns = [];
	// The latest scoreboard column created
	this.scoreboardColumnId;
	
	/**
	 * Scoreboards of each Corner Judge.
	 */
	this.scoreboards = {};

	/**
	 * Penalties ('warnings' and 'fouls') for each scoreboard column (except break states).
	 * Total maluses are stored against 'total' columns (as negative integers).
	 */
	this.penalties = {};
}

// Inherit EventEmitter
util.inherits(Match, EventEmitter);


/**
 * Get the state of the match.
 * @return {Object}
 */
Match.prototype.getState = function () {
	return {
		state: this.state,
		isBreak: this.state === States.BREAK,
		stateStarted: this.stateStarted,
		injuryStarted: this.injuryStarted
	};
};

/**
 * Get the current scores of a Corner Judge.
 * @param {String} cjId
 * @return {Array}
 */
Match.prototype.getScores = function (cjId) {
	assert.string(cjId, 'cjId');
	
	var scoreboard = this.scoreboards[cjId];
	return scoreboard ? scoreboard[this.scoreboardColumnId] : [0, 0];
};

/**
 * Get the current penalties.
 * @return {Object}
 */
Match.prototype.getPenalties = function () {
	return this.penalties[this.scoreboardColumnId];
};

/**
 * Compute maluses from one or more scoreboard columns' penalties, knowing that:
 * - 3 warnings = -1 pt
 * - 1 foul 	= -1 pt
 */
Match.prototype._computeMaluses = function (columnId) {
	var penalties = this.penalties[columnId];

	var maluses = [0, 0];
	for (var i = 0; i <= 1; i += 1) {
		maluses[i] -= Math.floor(penalties.warnings[i] / 3) + penalties.fouls[i];
	}

	return maluses;
};

/**
 * Ask judges to compute their total scores,
 * and compute total maluses for the last round(s)
 */
Match.prototype._computeTotals = function () {
	// Create a unique key for the new total column
	var totalColumnId = 'total-' + this.scoreboardColumns.length;
	this.scoreboardColumns.push(totalColumnId);

	// Compute total maluses in penalties object
	var maluses = this._computeMaluses(this.scoreboardColumnId);
	this.penalties[totalColumnId] = maluses;

	// Compute total scores in scorboard objects
	Object.keys(this.scoreboards).forEach(function (cjId) {
		// Retrieve Corner Judge's scoreboard and latest round's scores
		var scoreboard = this.scoreboards[cjId];
		var scores = scoreboard[this.scoreboardColumnId];
			
		// If scoreboard column doesn't exist, create it
		if (!scores) {
			scores = scoreboard[this.scoreboardColumnId] = [0, 0];
		}
		
		// Sum scores and maluses (negative integers)
		var totals = [scores[0] + maluses[0], scores[1] + maluses[1]];
		scoreboard[totalColumnId] = totals;
	}, this);

	return totalColumnId;
};

/**
 * Compute the winner for the last round(s).
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
		var winner = totals[0] > totals[1] ? Competitors.HONG : (totals[1] > totals[0] ? Competitors.CHONG : null);

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
 * Compute the winner, maluses and total scores for the last round(s).
 */
Match.prototype._computeResult = function () {
	this.winner = this._computeWinner(this._computeTotals());
	this.emit('resultsComputed');
};

Match.prototype.nextState = function () {
	// If no more states in array, add more if appropriate or end match
	if (this.stateIndex === this.states.length - 1) {
		if (this.state === States.ROUND_1 && this.config.twoRounds) {
			// Add Break and Round 2 states
			this.states.push(States.BREAK, States.ROUND_2);
		} else {
			// Compute the result for the last round(s)
			this._computeResult();
			var isTie = this.winner === null;

			if (this.state !== States.GOLDEN_POINT && isTie) {
				var tbOrNull = this.config.tieBreaker ? States.TIE_BREAKER : null;
				var gpOrNull = this.config.goldenPoint ? States.GOLDEN_POINT : null;
				var eitherOrNull = tbOrNull ? tbOrNull : gpOrNull;

				var extraRound = this.state === States.TIE_BREAKER ? gpOrNull : eitherOrNull;
				if (extraRound) {
					this.states.push(States.BREAK, extraRound);
				} else {
					this.end();
					return;
				}
			} else {
				this.end();
				return;
			}
		}
	}

	this.stateIndex += 1;
	this.state = this.states[this.stateIndex];

	if (this.state !== States.BREAK && this.state !== States.ROUND_2) {
		// Add a new column to the judges' scoreboards
		this.scoreboardColumnId = this.state === States.ROUND_1 ? 'main' : this.state;
		this.scoreboardColumns.push(this.scoreboardColumnId);
		this.emit('scoresReset', this.scoreboardColumnId);

		// Initialise penalty arrays for new state
		this.penalties[this.scoreboardColumnId] = {
			warnings: [0, 0],
			fouls: [0, 0]
		};
		this.emit('penaltiesReset', this.state);
	}

	// Update database
	var state = this.getState();
	DB.setMatchState(this.id, state, function () {
		this.emit('stateChanged', state);
	}.bind(this));
};

/**
 * End the match.
 */
Match.prototype.end = function () {
	// Update the database
	DB.setMatchEnded(this.id, true, function () {
		this.state = null;
		this.emit('ended');
		
		logger.info('ended', {
			id: this.id
		});
	}.bind(this));
};

Match.prototype.isInProgress = function () {
	return this.state !== null && (this.stateStarted || this.stateIndex > 0);
};

Match.prototype.startState = function () {
	assert.ok(this.state, "invalid match state")
	assert.ok(!this.stateStarted, "state already started");

	this.stateStarted = true;
	this.emit('stateChanged', this.getState());
};

Match.prototype.endState = function () {
	assert.ok(this.state, "invalid match state")
	assert.ok(this.stateStarted, "state already ended");
	
	this.stateStarted = false;
	// Move to next state (this will trigger a `stateChanged` event)
	this.nextState();
};

Match.prototype.startEndInjury = function () {
	this.injuryStarted = !this.injuryStarted;
	this.emit('stateChanged', this.getState());
};

Match.prototype.incrementPenalty = function (type, competitor) {
	this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] += 1;
};

Match.prototype.decrementPenalty = function (type, competitor) {
	this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] -= 1;
};


exports.Match = Match;
