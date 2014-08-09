
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
