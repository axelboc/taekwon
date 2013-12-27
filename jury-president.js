
var io;
var Ring = require('./ring').Ring;


function JuryPresident(sio, socket) {
	io = sio;
	this.socket = socket;
	
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('cornerJudgeAuthorised', this.onCornerJudgeAuthorised.bind(this));
	this.socket.on('startMatch', this.onStartMatch.bind(this));
}


JuryPresident.prototype.onCreateRing = function (ringId) {
	this.debug("Creating ring with id=" + ringId);
	if (!Ring.get(ringId)) {
		this.ring = new Ring(io, ringId, this);
		this.debug("> Ring created");
		this.socket.emit('ringCreated', ringId);
		io.sockets.emit('newRing', ringId);
	} else {
		this.debug("> Ring already exists");
		this.socket.emit('ringAlreadyExists', ringId);
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
