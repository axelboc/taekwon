
var Match = require('./match').Match;

var rings = {};


function Ring (id, juryPresident) {
	this.id = id;
	rings[id] = this;
	
	this.juryPresident = juryPresident;
	this.cornerJudges = [];
}


Ring.get = function (id) {
	return rings[id];
};

Ring.prototype.addCornerJudge = function (cornerJudgeId) {
	var cornerJudge = require('./corner-judge').CornerJudge.get(cornerJudgeId);
	
	if (this.cornerJudges.length >= 4) {
		cornerJudge.socket.emit('ringIsFull', ringId);
	} else {
		this.cornerJudges.push(cornerJudge);
		cornerJudge.ringJoined.call(cornerJudge, this);
	}
};


exports.Ring = Ring;
