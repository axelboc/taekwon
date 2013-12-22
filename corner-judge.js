
var io;
var cornerJudges = {};


function CornerJudge(sio, socket, name) {
	io = sio;
	this.socket = socket;
	
	this.id = CornerJudge.count++;
	this.name = name;
	cornerJudges[this.id] = this;
	
	this.socket.on('joinRing', this.onJoinRing.bind(this));
}


CornerJudge.count = 0;
CornerJudge.get = function (id) {
	return cornerJudges[id]
};

CornerJudge.prototype.onJoinRing = function (ringId) {
	this.debug("Joining ring with ID=" + ringId);
	
	var ring = require('./ring').Ring.get(ringId);
	
	if (!ring) {
		this.debug("  Ring does not exist");
		this.socket.emit('ringDoesNotExist', ringId);
		
	} else if (ring.cornerJudges.length >= 4) {
		this.debug("  Ring is full");
		this.socket.emit('ringIsFull', ringId);
		
	} else {
		this.debug("  Request authorisation");
		ring.juryPresident.authoriseCornerJudge(this);
	}
};

CornerJudge.prototype.ringJoined = function (ring) {
	this.debug("  Ring joined");
	
	this.ring = ring;
	this.socket.emit('ringJoined', ring.id);
};



CornerJudge.prototype.debug = function (msg) {
	console.log("[Corner Judge #" + this.id + "] " + msg);
};


exports.CornerJudge = CornerJudge;
