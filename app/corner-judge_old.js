
function CornerJudge(io, socket, id, name) {
	this.io = io;
	this.socket = socket;
	this.connected = true;
	
	this.id = id;
	this.name = name;
	this.ring = null;
	this.authorised = false;
}

CornerJudge.prototype.initSocket = function () {
	this.socket.on('score', this.onScore.bind(this));
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('sessionRestored', this.onSessionRestored.bind(this));
};

CornerJudge.prototype.onScore = function (score) {
	this.debug("Scored " + score.points + " for " + score.competitor);
	this.ring.juryPresident.cornerJudgeScored(this, score);
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
