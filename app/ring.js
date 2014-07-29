
var Config = require('./config');

var rings = [];

// TODO: change wording from 'índex' to 'number' to distinguish with ring index in system
var ringAllocations = [];
for (var i = 0; i < Config.ringCount; i += 1) {
    ringAllocations.push({
        index: i + 1,
        allocated: false
    });
}


function Ring(io, index, juryPresident) {
	this.io = io;
	
	this.index = index;
	rings[index] = this;
    ringAllocations[index].allocated = true;
	this.scoringEnabled = false;
	
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

Ring.delete = function (ring) {
	if (ring) {
		rings[ring.index] = null;
		ringAllocations[ring.index].allocated = false;
	}
};


Ring.prototype.addCornerJudge = function (cornerJudge) {
	this.cornerJudges.push(cornerJudge);
	cornerJudge.socket.join(this.roomId);
	cornerJudge.ringJoined.call(cornerJudge, this);
};

Ring.prototype.removeCornerJudge = function (cornerJudgeId) {
	for (var i = 0, len = this.cornerJudges.length; i < len; i += 1) {
		if (this.cornerJudges[i].id === cornerJudgeId) {
			break;
		}
	}
	
	var cornerJudge = this.cornerJudges[i];
	this.cornerJudges.splice(i, 1);
	cornerJudge.socket.leave(this.roomId);
	cornerJudge.removedFromRing.call(cornerJudge, this);
};

Ring.prototype.juryPresidentStateChanged = function (connected) {
	this.debug("Jury president " + (connected ? "connected" : "disconnected"));
	// TODO: fix 'juryPresidentStateChanged' event not emitted after disconnection and restoration of CJ
	this.io.room(this.roomId).write({
		emit: ['juryPresidentStateChanged', connected]
	});
};

Ring.prototype.scoringStateChanged = function (enabled) {
	this.scoringEnabled = enabled;
	// TODO: fix 'scoringStateChanged' event not emitted after disconnection and restoration of CJ
	this.io.room(this.roomId).write({
		emit: ['scoringStateChanged', enabled]
	});
};

Ring.prototype.debug = function (msg) {
	console.log("[Ring] " + msg);
};


exports.Ring = Ring;
