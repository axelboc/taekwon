
var io;
var rings = {};
var Match = require('./match').Match;


function Ring(sio, id, juryPresident) {
	io = sio;
	
	this.id = id;
	rings[id] = this;
	
	this.juryPresident = juryPresident;
	this.cornerJudges = [];
	
	this.roomId = 'ring' + this.id;
	this.juryPresident.socket.join(this.roomId);
}


Ring.get = function (id) {
	return rings[id];
};

Ring.getIds = function () {
	return Object.keys(rings);
};


Ring.prototype.addCornerJudge = function (cornerJudgeId) {
	var cornerJudge = require('./corner-judge').CornerJudge.get(cornerJudgeId);
	
	if (this.cornerJudges.length >= 4) {
		cornerJudge.socket.emit('ringIsFull', ringId);
	} else {
		this.cornerJudges.push(cornerJudge);
		cornerJudge.socket.join(this.roomId);
		cornerJudge.ringJoined.call(cornerJudge, this);
	}
};

Ring.prototype.startMatch = function () {
	this.match = new Match();
	io.sockets.in(this.roomId).emit('matchStarted', this.match.id);
};


exports.Ring = Ring;
