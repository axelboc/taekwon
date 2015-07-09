'use strict'

// Dependencies
var assert = require('./lib/assert');
var logger = require('./lib/log')('scoreboard');
var DB = require('./lib/db');
var Competitors = require('./enum/competitors');


/**
 * The scoreboard of a Corner Judge during a match.
 * A new scoreboard is initialised for each judge and each match.
 * @param {String} cjName
 */
function Scoreboard(cjName) {
	assert.string(cjName, 'cjName');
	this.cjName = cjName;
	
	// The columns of the scoreboard
	// Each column stores either the raw scores or the totals (inc. maluses) for a period of the match
	this.columns = {};
}

/**
 * Get a column of the scoreboard.
 * @param {String} colId
 */
Scoreboard.prototype.getColumn = function (colId) {
	assert.string(colId, 'colId');
	assert.ok(this.columns[colId], "column with name '" + colId + "' doesn't exist");
	
	// Get and return the column
	return this.columns[colId];
};

/**
 * Add a column to the scoreboard.
 * @param {String} colId
 */
Scoreboard.prototype.addColumn = function (colId) {
	assert.string(colId, 'colId');
	assert.ok(!this.columns[colId], "column with name '" + colId + "' already exists");
	
	// Initiliase the new column
	this.columns[colId] = {
		hong: 0,
		chong: 0
	});
};

/**
 * Mark a new score.
 * @param {String} colId
 * @param {String} competitor
 * @param {Interger} value - can be negative when undoing
 */
Scoreboard.prototype.markScore = function (colId, competitor, value) {
	assert.string(colId, 'colId');
	assert.string(competitor, 'competitor');
	assert.integer(value, 'value');
	assert.ok(this.columns[colId], "column with name '" + colId + "' doesn't exist");
	
	// Add the score's value
	this.columns[colId][competitor] += value;
};

/**
 * Compute the totals for a period of the match and store them in a new column.
 * @param {String} fromColId - the column ID of the period of which to compute the totals
 * @param {String} totalColId - the ID of the new total column
 * @param {Object} maluses - the maluses to add to the raw scores for the period
 */
Scoreboard.prototype.computeTotalColumn = function (fromColId, totalColId, maluses) {
	assert.string(fromColId, 'fromColId');
	assert.string(totalColId, 'totalColId');
	assert.object(maluses, 'maluses');
	assert.ok(this.columns[fromColId], "column with name '" + fromColId + "' doesn't exist");
	assert.ok(!this.columns[totalColId], "column with name '" + totalColId + "' already exists");
	
	// Retrieve the column containing the raw scores
	var fromCol = this.columns[fromColId];
	
	// Sum the raw scores with the maluses and store the totals in a new column
	this.columns[totalColId] = {
		hong: fromCol.hong + maluses.hong,
		chong: fromCol.chong + maluses.chong
	};
};

/**
 * Compute the winner given the ID of a total column.
 * @param {String} totalColId - the ID of the new total column
 * @return {String} - the winner, or `null` if the period was a draw
 */
Scoreboard.prototype.computeWinner = function (totalColId) {
	assert.string(totalColId, 'totalColId');
	assert.ok(this.columns[totalColId], "column with name '" + totalColId + "' doesn't exist");
	
	// Retrieve the total column
	var totalColumn = this.columns[totalColId];
	
	// Compute the winner
	var winner = totalColumn.hong > totalColumn.chong ? Competitors.HONG : 
				 (totalColumn.chong > totalColumn.hong ? Competitors.CHONG : null);
};

module.exports.Scoreboard = Scoreboard;
