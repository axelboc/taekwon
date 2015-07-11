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
	this.scores = {};
	this.totals = null;
	this.winner = null;
	
	// Initialise score to 0 for each competitor
	Object.keys(Competitors).forEach(function (comp) {
		this.scores[comp] = 0;
	});
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
	this.scores[competitor] += value;
};

/**
 * Compute the totals for the period.
 * @param {Object} maluses - the maluses to add to the scores for the period
 */
ScoringSheet.prototype.computeTotals = function (maluses) {
	assert.object(maluses, 'maluses');
	
	// Sum the raw scores with the maluses for each competitor
	Object.keys(Competitors).forEach(function (comp) {
		this.totals[comp] = this.scores[comp] + maluses[comp];
	});
	
	// Compute the winner of the period
	this.winner = this.totals.hong > this.totals.chong ? Competitors.HONG : 
				  (this.totals.chong > this.totals.hong ? Competitors.CHONG : null);
};

module.exports.ScoringSheet = ScoringSheet;
