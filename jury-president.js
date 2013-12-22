
var io;
var Ring = require('./ring').Ring;


function JuryPresident(sio, socket) {
	io = sio;
	this.socket = socket;
	
	this.socket.on('createRing', this.onCreateRing.bind(this));
	this.socket.on('cornerJudgeAuthorised', this.onCornerJudgeAuthorised.bind(this));
}


JuryPresident.prototype.onCreateRing = function (ringId) {
	this.debug("Creating ring with ID=" + ringId);
	if (!Ring.get(ringId)) {
		this.ring = new Ring(ringId, this);
		this.debug("  Ring created");
		this.socket.emit('ringCreated', ringId);
	} else {
		this.debug("  Ring already exists");
		this.socket.emit('ringAlreadyExists', ringId);
	}
};

JuryPresident.prototype.authoriseCornerJudge = function (cornerJudge) {
	this.debug("Authorising corner judge with ID=" + cornerJudge.id);
	this.socket.emit('authoriseCornerJudge', cornerJudge.id);
};

JuryPresident.prototype.onCornerJudgeAuthorised = function (cornerJudgeId) {
	this.debug("  Corner judge authorised");
	this.ring.addCornerJudge(cornerJudgeId);
};


JuryPresident.prototype.debug = function (msg) {
	console.log("[Jury President] " + msg);
};


exports.JuryPresident = JuryPresident;
