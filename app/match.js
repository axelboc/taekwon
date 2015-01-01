
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('ring');
var util = require('./lib/util');
var DB = require('./lib/db');
var EventEmitter = require('events').EventEmitter;


/**
 * Match.
 * @param {String} id
 */
function Match(id) {
	assert.string(id, 'id');
	
	this.id = id;
}

// Inherit EventEmitter
util.inherits(Match, EventEmitter);



exports.Match = Match;
