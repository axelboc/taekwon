
var Ring = require('./ring').Ring;


function JuryPresident(io, socket, id) {
	this.io = io;
	this.socket = socket;
	this.connected = true;
	this.id = id;
	this.ring = null;
}

JuryPresident.prototype.initSocket = function () {
	this.socket.on('enableScoring', this.onEnableScoring.bind(this));
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('sessionRestored', this.onSessionRestored.bind(this));
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
