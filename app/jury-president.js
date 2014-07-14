
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
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('authoriseCornerJudge', this.onCornerJudgeAuthorisation.bind(this, true));
	this.socket.on('ringIsFull', this.onRingIsFull.bind(this));
	this.socket.on('matchInProgress', this.onMatchInProgress.bind(this));
	this.socket.on('rejectCornerJudge', this.onCornerJudgeAuthorisation.bind(this, false));
	this.socket.on('removeCornerJudge', this.onRemoveCornerJudge.bind(this));
	this.socket.on('enableScoring', this.onEnableScoring.bind(this));
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('sessionRestored', this.onSessionRestored.bind(this));
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
	this.debug(cornerJudge.id);
	
	// Requesting authorisation from client
	this.socket.emit('newCornerJudge', {
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
		this.debug(cornerJudgeId);
		this.waitingList[cornerJudgeId].ringNotJoined(this.ring);
	}
	
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onRingIsFull = function (cornerJudgeId) {
	this.waitingList[cornerJudgeId].ringIsFull(this.ring);
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onMatchInProgress = function (cornerJudgeId) {
	this.waitingList[cornerJudgeId].matchInProgress(this.ring);
	// Remove corner judge from waiting list
	delete this.waitingList[cornerJudgeId];
};

JuryPresident.prototype.onRemoveCornerJudge = function (cornerJudgeId) {
	this.debug("> Corner judge removed from ring");
	this.ring.removeCornerJudge(cornerJudgeId);
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

JuryPresident.prototype.cornerJudgeScored = function (cornerJudge, score) {
	score.judgeId = cornerJudge.id;
	this.socket.emit('cornerJudgeScored', score);
};

JuryPresident.prototype.onDisconnect = function () {
	this.debug("Disconnected");
	this.connected = false;
	
	if (this.ring) {
		this.ring.juryPresidentStateChanged(false);
		this.ring.scoringStateChanged(false);
	}
};

JuryPresident.prototype.restoreSession = function (newSocket) {
	this.debug("Restoring session");
	
	this.socket = newSocket;
	this.initSocket();
	
	// Prepare restoration data
	var restorationData = {
		ringAllocations: Ring.getRingAllocations(),
		ringIndex: this.ring ? this.ring.index : -1,
		cornerJudges: []
	};
	
	// Add corner judges
	if (this.ring) {
		var addJudge = function (judge) {
			restorationData.cornerJudges.push({
				id: judge.id,
				name: judge.name,
				connected: judge.connected,
				authorised: judge.authorised
			});
		}
		
		// Add authorised judges
		this.ring.cornerJudges.forEach(addJudge, this);
		// Add judges waiting for authorisation
		Object.keys(this.waitingList).forEach(function (id) {
			addJudge(this.waitingList[id]);
		}, this);
		
	} 
	
	// Send session restore event with all the required data
	this.socket.emit('restoreSession', restorationData);
};

JuryPresident.prototype.onSessionRestored = function () {
	this.debug("> Session restored");
	this.connected = true;
	if (this.ring) {
		// Let corner judges know that jury president is reconnected
		this.ring.juryPresidentStateChanged(true);
	}
};

/* Exit the system and close the ring */
JuryPresident.prototype.exit = function () {
	// TODO: Close the ring after removing corner judges
	this.connected = false;
	Ring.delete(this.ring);
	this.ring = null;
}

JuryPresident.prototype.debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
