
var Config = require('./config');

var rings = [];

var ringAllocations = [];
for (var i = 0; i < Config.ringCount; i += 1) {
    ringAllocations[i] = {
        index: i + 1,
        allocated: false
    };
}


function Ring(io, index, juryPresident) {
	this.io = io;
	
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


Ring.prototype.addCornerJudge = function (cornerJudge) {
	if (this.cornerJudges.length >= 4) {
		cornerJudge.socket.emit('ringIsFull', this.index);
	} else {
		this.cornerJudges.push(cornerJudge);
		cornerJudge.socket.join(this.roomId);
		cornerJudge.ringJoined.call(cornerJudge, this);
	}
};

Ring.prototype.juryPresidentStateChanged = function (connected) {
	this.debug("Jury president " + (connected ? "connected" : "disconnected"));
	this.io.sockets.in(this.roomId).emit('juryPresidentStateChanged', connected);
};

Ring.prototype.scoringStateChanged = function (enabled) {
	this.io.sockets.in(this.roomId).emit('scoringStateChanged', enabled);
};

Ring.prototype.debug = function (msg) {
	console.log("[Ring] " + msg);
};


exports.Ring = Ring;
