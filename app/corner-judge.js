
var Ring = require('./ring').Ring;


function CornerJudge(io, socket, id, name) {
	this.io = io;
	this.socket = socket;
	this.connected = true;
	
	this.id = id;
	this.name = name;
	this.ring = null;
	this.authorised = false;
	
	// Send ring allocations and success events to client
	socket.emit('ringAllocations', Ring.getRingAllocations());
	socket.emit('idSuccess', true);
	
	// Listen to client events
	this.initSocket();
}

CornerJudge.prototype.initSocket = function () {
	this.socket.on('joinRing', this.onJoinRing.bind(this));
	this.socket.on('score', this.onScore.bind(this));
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('sessionRestored', this.onSessionRestored.bind(this));
};


CornerJudge.prototype.onJoinRing = function (index) {
	this.debug("Joining ring with index=" + index);
	
	var ring = require('./ring').Ring.get(index);
	
	if (!ring) {
		this.debug("> Ring does not exist");
		this.socket.emit('ringDoesNotExist', index);
	} else {
		this.debug("> Requesting authorisation from Jury President");
		this.ring = ring;
		this.ring.juryPresident.authoriseCornerJudge(this);
	}
};

CornerJudge.prototype.ringJoined = function (ring) {
	this.debug("> Ring joined");
	this.authorised = true;
	this.socket.emit('ringJoined', {
		ringIndex: ring.index,
		scoringEnabled: ring.scoringEnabled,
		jpConnected: ring.juryPresident.connected
	});
};

CornerJudge.prototype.ringNotJoined = function (ring) {
	this.debug("> Ring not joined (rejected by Jury President)");
	this.ring = null;
	this.socket.emit('ringNotJoined', ring.index);
};

CornerJudge.prototype.ringIsFull = function (ring) {
	this.debug("> Ring is full");
	this.ring = null;
	this.socket.emit('ringIsFull', ring.index);
};

CornerJudge.prototype.onScore = function (score) {
	this.debug("Scored " + score.points + " for " + score.competitor);
	this.ring.juryPresident.cornerJudgeScored(this, score);
};

CornerJudge.prototype.removedFromRing = function (ring) {
	this.debug("Removed from ring");
	this.ring = null;
	this.authorised = false;
	this.socket.emit('removedFromRing', ring.index);
};

CornerJudge.prototype.onDisconnect = function () {
	this.debug("Disconnected");
	this.connected = false;
	
	if (this.ring) {
		this.ring.juryPresident.cornerJudgeStateChanged(this);
	}
};

CornerJudge.prototype.restoreSession = function (newSocket) {
	this.debug("Restoring session");
	
	this.socket = newSocket;
	this.initSocket();
	
	// Send session restore event with all the required data
	this.socket.emit('restoreSession', {
		ringAllocations: Ring.getRingAllocations(),
		ringIndex: this.ring ? this.ring.index : -1,
		authorised: this.authorised,
		scoringEnabled: this.ring ? this.ring.scoringEnabled : false,
		jpConnected: this.ring ? this.ring.juryPresident.connected : false
	});
};

CornerJudge.prototype.onSessionRestored = function () {
	this.debug("> Session restored");
	this.connected = true;
	if (this.ring) {
		// Let corner judges know that jury president is reconnected
		this.ring.juryPresident.cornerJudgeStateChanged(this);
	}
};

/* Exit the system and leave the ring */
CornerJudge.prototype.exit = function () {
	this.debug("Exit");
	// TODO: Exit after 30s of being disconnected
	this.ring = null;
	this.authorised = false;
};

CornerJudge.prototype.debug = function (msg) {
	console.log("[Corner Judge] " + msg);
};


exports.CornerJudge = CornerJudge;
