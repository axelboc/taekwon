
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var MatchState = require('./match-state').MatchState;

var Match = function () {
	EventEmitter.call(this);
	
	this.state = MatchState.SETUP;
	
	this.emit('new-match');
};



util.inherits(Match, EventEmitter);
exports.Match = Match;
