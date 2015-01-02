
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('match');
var util = require('./lib/util');
var DB = require('./lib/db');
var EventEmitter = require('events').EventEmitter;


/**
 * Match.
 * @param {String} id
 */
function Match(id, config) {
	assert.string(id, 'id');
	
	this.id = id;
}

// Inherit EventEmitter
util.inherits(Match, EventEmitter);

/**
 * End the match.
 * @param {Function} cb
 */
Match.prototype.end = function (cb) {
	// Update the database
	DB.setMatchEnded(this.id, function () {
		logger.info('ended', {
			id: this.id
		});
		cb();
	}.bind(this));
};

exports.Match = Match;
