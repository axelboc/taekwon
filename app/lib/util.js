
// Modules
var assert = require('./assert');

// Import Node's core `assert` module, then extend it.
var util = require('util');


/**
 * Listen for events.
 * @param {Mixed} context - the listening context
 * @param {Mixed} from - the source of the events
 * @param {Array} events - the events to listen to
 * @param {String} funcPrefix - the prefix of the event handler functions in the context
 */
util.addEventListeners = function (context, from, events, funcPrefix) {
	assert.provided(context, 'context');
	assert.provided(from, 'from');
	assert.ok(typeof from.on === 'function', "`from` must inherit EventEmitter");
	assert.array(events, 'events');
	assert.string(funcPrefix, 'funcPrefix');
	
	events.forEach(function (evt) {
		// Construct the name of the event handler function
		var funcName = funcPrefix + evt.charAt(0).toUpperCase() + evt.slice(1);
		
		// Verify that the function exists in the context
		assert.function(context[funcName], funcName);
		
		// Register the event handler
		from.on(evt, context[funcName].bind(context));
	});
};

/**
 * Stop listening for events.
 * @param {Mixed} from - the source of the events
 * @param {Array} events - the events to listen to
 */
util.removeEventListeners = function (from, events) {
	assert.provided(from, 'from');
	assert.ok(typeof from.removeAllListeners === 'function', "`from` must inherit EventEmitter");
	assert.array(events, 'events');
	
	events.forEach(function (evt) {
		from.removeAllListeners(evt);
	});
};

/**
 * Create a score object.
 * @param {String} competitor
 * @param {Number} points
 */
util.createScoreObject = function (competitor, points) {
	assert.string(competitor, 'competitor');
	assert.integerGt0(points, 'points');
	
	return {
		competitor: competitor,
		points: points
	};
};

/**
 * Convert a number of seconds to a time string of the form '0:00'.
 * @param {Integer} num
 * @return {String}
 */
util.numToTime = function (num) {
	var sec = num % 60;
	return Math.floor(num / 60) + ":" + (sec < 10 ? '0' : '') + sec;
};

module.exports = util;
