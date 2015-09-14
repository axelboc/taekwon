'use strict';

// Dependencies
var assert = require('../lib/assert');

// Regular expressions
var MAIN_ROUND_REGEX = /^Round/;

/**
 * Match rounds enum and helpers.
 * @type {Object}
 */
var MatchStates = {
	
	ROUND_1: 'Round 1',
	ROUND_2: 'Round 2',
	TIE_BREAKER: 'Tie Breaker',
	GOLDEN_POINT: 'Golden Point',
	
	/**
	 * Is main round?
	 * @param {String} round
	 */
	isMainRound: function (round) {
		assert.string(round, 'round');
		return MAIN_ROUND_REGEX.test(round);
	}
	
};

module.exports = MatchStates;
