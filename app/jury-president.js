
var Ring = require('./ring').Ring;


function JuryPresident(io, socket, id) {
	this.io = io;
	this.socket = socket;
	this.connected = true;
	this.id = id;
	this.ring = null;
	this.waitingList = {};

	// Send ring allocations and success events to client
	socket.emit('ringAllocations', Ring.getRingAllocations());
	socket.emit('idSuccess', true);
	
	// Listen to client events
	this.initSocket();
}

JuryPresident.prototype.initSocket = function () {
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('cornerJudgeAccepted', this.onCornerJudgeAuthorisation.bind(this, true));
	this.socket.on('cornerJudgeRejected', this.onCornerJudgeAuthorisation.bind(this, false));
	this.socket.on('enableScoring', this.onEnableScoring.bind(this));
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
	this.socket.emit('authoriseCornerJudge', {
		id: cornerJudge.id,
		name: cornerJudge.name
	});
};

JuryPresident.prototype.onCornerJudgeAuthorisation = function (accepted, cornerJudgeId) {
	this.debug("> Corner judge " + (accepted ? "accepted" : "rejected"));

	if (accepted) {
		// Add corner judge to ring
		this.ring.addCornerJudge(this.waitingList[cornerJudgeId]);
	} else {
		this.waitingList[cornerJudgeId].ringNotJoined(this.ring);
	}
	
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onEnableScoring = function (enable) {
	this.ring.scoringStateChanged(enable);
	this.debug("Scoring " + (enable ? "enabled" : "disabled"));
};


JuryPresident.prototype.cornerJudgeStateChanged = function (cornerJudge) {
	this.debug("Corner judge " + (cornerJudge.connected ? "connected" : "disconnected"));
	this.socket.emit('cornerJudgeStateChanged', {
		id: cornerJudge.id,
		name: cornerJudge.name,
		connected: cornerJudge.connected
	});
};

JuryPresident.prototype.restoreSession = function (newSocket) {
	this.debug("Restoring session...");
	
	this.socket = newSocket;
	this.connected = true;
	this.initSocket();
	
	var hasRing = this.ring !== null;
	
	// Send success event to client
	// If JP doesn't have a ring, client must show the ring creation view
	newSocket.emit('idSuccess', !hasRing);
	
	// If JP has ring, client must show the match view
	if (hasRing) {
		newSocket.emit('ringCreated', this.ring.index);
		
		// Restore corner judges
		this.ring.cornerJudges.forEach(this.cornerJudgeStateChanged.bind(this));
		for (var judgeId in this.waitingList) {
			if (this.waitingList.hasOwnProperty(judgeId)) {
				this.authoriseCornerJudge(this.waitingList[judgeId]);
			}
		}
		
		// Let corner judges know that jury president is reconnected
		this.ring.juryPresidentStateChanged(true);
	}
	
	this.debug("> Session restored");
};

JuryPresident.prototype.onDisconnect = function () {
	this.debug("Disconnected");
	this.connected = false;
	
	if (this.ring) {
		this.ring.juryPresidentStateChanged(false);
	}
};

/* Exit the system and close the ring */
JuryPresident.prototype.exit = function () {
	// TODO: Close the ring and ask corner judges to leave it
}

JuryPresident.prototype.debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
