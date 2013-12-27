
var MatchState = require('./match-state').MatchState;

var Match = function () {
	this.id = Match.count++;
	this.state = MatchState.SETUP;
};


Match.count = 0;


exports.Match = Match;
