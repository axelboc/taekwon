'use strict';

// Dependencies
var assert = require('../lib/assert');

// Regular expressions
var IDLE_REGEX = /^.*idle$/;
var STARTED_REGEX = /^.*started$/;
var BREAK_REGEX = /^break.*$/;

/**
 * Match states enum and helpers.
 * @type {Object}
 */
var MatchStates = {
	
	ROUND_IDLE: 'roundidle',
	ROUND_STARTED: 'roundstarted',
	ROUND_ENDED: 'roundended',
	BREAK_IDLE: 'breakidle',
	BREAK_STARTED: 'breakstarted',
	BREAK_ENDED: 'breakended',
	INJURY: 'injury',
	RESULTS: 'results',
	MATCH_ENDED: 'matchended',
	
	/**
	 * Is idle state?
	 * @param {String} state
	 */
	isIdle: function (state) {
		assert.string(state, 'state');
		return IDLE_REGEX.test(state);
	},
	
	/**
	 * Is started state?
	 * @param {String} state
	 */
	isStarted: function (state) {
		assert.string(state, 'state');
		return STARTED_REGEX.test(state);
	},
	
	/**
	 * Is break state?
	 * @param {String} state
	 */
	isBreak: function (state) {
		assert.string(state, 'state');
		return BREAK_REGEX.test(state);
	},
	
	/**
	 * Is injury state?
	 * @param {String} state
	 */
	isInjury: function (state) {
		assert.string(state, 'state');
		return state === MatchStates.INJURY;
	},
	
	/**
	 * Is state for which scoring is enabled?
	 * @param {String} state
	 */
	isScoringEnabled: function (state) {
		assert.string(state, 'state');
		return state === MatchStates.ROUND_STARTED;
	}
	
};

module.exports = MatchStates;
