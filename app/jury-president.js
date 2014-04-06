
var Ring = require('./ring').Ring;


function JuryPresident(io, socket, id) {
	this.io = io;
	this.socket = socket;
	this.id = id;
	this.ring = null;
	this.waitingList = {};

	// Send ring allocations and success events to client
	socket.emit('ringAllocations', Ring.getRingAllocations());
	socket.emit('idSuccess', true);
	
	// Listen to client events
	this.initSocket();
}

JuryPresident.prototype.restoreSession = function (newSocket) {
	this.debug("Restoring session...");
	
	this.socket = newSocket;
	this.initSocket();
	
	var hasRing = this.ring !== null;
	
	// Send success event to client
	// If JP doesn't have a ring, client must show the ring creation view
	this.socket.emit('idSuccess', !hasRing);
	
	// If JP has ring, client must show the match view
	if (hasRing) {
		this.socket.emit('ringCreated', this.ring.index);
	}
	
	this.debug("> Session restored");
}

JuryPresident.prototype.initSocket = function () {
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('cornerJudgeAuthorised', this.onCornerJudgeAuthorised.bind(this));
	this.socket.on('startMatch', this.onStartMatch.bind(this));
};


JuryPresident.prototype.onCreateRing = function (index) {
	this.debug("Creating ring #" + (index + 1));
	if (!Ring.get(index)) {
		this.ring = new Ring(this.io, index, this);
		this.debug("> Ring created");
		this.socket.emit('ringCreated', index);
		this.io.sockets.emit('ringAllocationChanged', Ring.getRingAllocation(index));
	} else {
		this.debug("> Ring already exists");
		this.socket.emit('ringAlreadyExists', index);
	}
};

JuryPresident.prototype.authoriseCornerJudge = function (cornerJudge) {
	this.debug("Authorising corner judge with id=" + cornerJudge.id);
	
	// Adding corner judge to waiting list
	this.waitingList[cornerJudge.id] = cornerJudge;
	
	// Requesting authorisation from client
	this.socket.emit('authoriseCornerJudge', cornerJudge.id);
};

JuryPresident.prototype.onCornerJudgeAuthorised = function (cornerJudgeId) {
	this.debug("> Corner judge authorised");
	
	// Add corner judge to ring
	this.ring.addCornerJudge(this.waitingList[cornerJudgeId]);
	
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onCornerJudgeDeclined = function (cornerJudgeId) {
	this.debug("> Corner judge declined");
	
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onStartMatch = function () {
	this.debug("Starting match");
	this.ring.startMatch();
	this.debug("> Match started");
};


JuryPresident.prototype.debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
