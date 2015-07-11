'use strict';

// Dependencies
var assert = require('./lib/assert');
var logger = require('./lib/log')('scoring-sheet');
var DB = require('./lib/db');
var Competitors = require('./enum/competitors');


/**
 * The scoring sheet of a Corner Judge.
 * A new sheet is initialised for each match period.
 */
function ScoringSheet() {
	this.scores = [0, 0];
	this.totals = null;
	this.winner = null;
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
		return this.scores[index] + maluses[index];
	});
	
	// Compute the winner of the scoring sheet
	this.winner = this.totals[0] > this.totals[1] ? Competitors.HONG : 
				  (this.totals[1] > this.totals[0] ? Competitors.CHONG : null);
};

module.exports.ScoringSheet = ScoringSheet;
