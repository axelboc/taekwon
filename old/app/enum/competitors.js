'use strict';

// Modules
var assert = require('../lib/assert');


/**
 * The competitors.
 * @type {Array}
 */
var competitors = ['hong', 'chong'];

/**
 * The competitors as an enum object (e.g. Competitors.HONG).
 * @type {Object}
 */
var competitorEnum = {};

/**
 * The competitor indices.
 * @type {Object}
 */
var competitorIndices = {};

/**
 * Get the competitor at the given index.
 * @param {Integer} index
 * @return {String}
 */
function get(index) {
	assert.ok(index >= 0 && index < competitors.length, "`index` out of range: " + index);
	return competitors[index];
}

/**
 * Get the index of a competitor.
 * @param {String} competitor
 * @return {Integer}
 */
function getIndex(competitor) {
	assert.string(competitor, 'competitor');
	return competitorIndices[competitor];
}


// Initialise the objects
competitorEnum = competitors.reduce(function (obj, competitor, index) {
	var key = competitor.toUpperCase();
	
	competitorIndices[competitor] = index;
	obj[key] = competitor;
	
	return obj;
}, {});


// Expose the competitor enum and the helper functions
module.exports = competitorEnum;
module.exports.get = get;
module.exports.getIndex = getIndex;
