'use strict';

// Dependencies
var assert = require('./lib/assert');
var log = require('./lib/log');
var DB = require('./lib/db');
var Competitors = require('./enum/competitors');


/**
 * The scoring sheet of a Corner Judge.
 * A new sheet is initialised for each match period.
 * @param {Object} data - scoring sheet data when restoring
 */
function ScoringSheet(data) {
	data = data || {};
	assert.object(data, 'data');
	
	this.scores = data.scores || [0, 0];
	this.totals = data.totals || null;
	this.winner = data.winner || null;
	
	this.logger = log.createLogger('scoringSheet', "Sheet");
}

/**
 * Mark a new score.
 * @param {String} competitor
 * @param {Interger} value - can be negative when undoing
 */
ScoringSheet.prototype.markScore = function (competitor, value) {
	assert.string(competitor, 'competitor');
	assert.integer(value, 'value');
	
	// Add the score's value
	var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
	this.scores[competitorIndex] += value;
	
	this.logger.info('scoreMarked', {
		competitor: competitor,
		value: value,
		newValue: this.scores[competitorIndex]
	});
};

/**
 * Compute the totals for the period.
 * @param {Array} maluses - the maluses to add to the scores for the period
 */
ScoringSheet.prototype.computeTotals = function (maluses) {
	assert.array(maluses, 'maluses');
	assert.ok(maluses.length === 2, "`maluses` array must contain two values");
	
	// Sum the scores with the maluses to get the totals
	this.totals = this.scores.map(function (score, index) {
		return score + maluses[index];
	});
	
	this.logger.info('totalsComputed', { totals: this.totals });
};

/**
 * Compute the winner for the period and return it.
 */
ScoringSheet.prototype.computeWinner = function () {
	if (this.totals[0] > this.totals[1]) {
		this.winner = Competitors.HONG;
	} else if (this.totals[1] > this.totals[0]) {
		this.winner = Competitors.CHONG;
	} else {
		this.winner = null;
	}
	
	this.logger.info('winnerComputed', { winner: this.winner });
};

module.exports.ScoringSheet = ScoringSheet;
