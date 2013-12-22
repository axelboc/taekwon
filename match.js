
var MatchState = require('./match-state').MatchState;

var Match = function () {
	this.state = MatchState.SETUP;
	
	this.emit('matchCreated');
};


exports.Match = Match;
