
var Config = require('./config');
var Match = require('./match').Match;

var io;
var rings = [];

var ringAllocations = [];
for (var i = 0; i < Config.ringsCount; i += 1) {
    ringAllocations[i] = {
        index: i + 1,
        allocated: false
    };
}


function Ring(sio, index, juryPresident) {
	io = sio;
	
	this.index = index;
	rings[index] = this;
    ringAllocations[index].allocated = true;
	
	this.juryPresident = juryPresident;
	this.cornerJudges = [];
	
	this.roomId = 'ring' + this.index;
	this.juryPresident.socket.join(this.roomId);
}


Ring.get = function (index) {
	return rings[index];
};

Ring.getRingAllocations = function () {
	return ringAllocations;
};

Ring.getRingAllocation = function (index) {
	return ringAllocations[index];
};


Ring.prototype.addCornerJudge = function (cornerJudgeId) {
	var cornerJudge = require('./corner-judge').CornerJudge.get(cornerJudgeId);
	
	if (this.cornerJudges.length >= 4) {
		cornerJudge.socket.emit('ringIsFull', this.index);
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
