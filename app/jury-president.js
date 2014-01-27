
var io;
var Ring = require('./ring').Ring;


function JuryPresident(sio, socket) {
	io = sio;
	this.socket = socket;
	
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('cornerJudgeAuthorised', this.onCornerJudgeAuthorised.bind(this));
	this.socket.on('startMatch', this.onStartMatch.bind(this));
}


JuryPresident.prototype.onCreateRing = function (index) {
	this.debug("Creating ring with index=" + index);
	if (!Ring.get(index)) {
		this.ring = new Ring(io, index, this);
		this.debug("> Ring created");
		this.socket.emit('ringCreated', index);
		io.sockets.emit('newRing', index);
	} else {
		this.debug("> Ring already exists");
		this.socket.emit('ringAlreadyExists', index);
	}
};

JuryPresident.prototype.authoriseCornerJudge = function (cornerJudge) {
	this.debug("Authorising corner judge with id=" + cornerJudge.id);
	this.socket.emit('authoriseCornerJudge', cornerJudge.id);
};

JuryPresident.prototype.onCornerJudgeAuthorised = function (cornerJudgeId) {
	this.debug("> Corner judge authorised");
	this.ring.addCornerJudge(cornerJudgeId);
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
