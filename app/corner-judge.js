
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function CornerJudge(tournament, primus, spark, sessionId, name) {
	// Call parent constructor
	User.apply(this, arguments);
	this.name = name;
	this.authorised = false;
}

// Inherit from User
util.inherits(CornerJudge, User);
parent = CornerJudge.super_.prototype;


CornerJudge.prototype.initSpark = function (spark) {
	parent.initSpark.call(this, spark);
};

CornerJudge.prototype.restoreSession = function (spark) {
	this._debug("Restoring session");
	var restorationData = parent.restoreSession.call(this, spark);
	restorationData.authorised = this.authorised;
	
	// Send session restore event with all the required data
	this.spark.emit('restoreSession', restorationData);
};

CornerJudge.prototype.remove = function () {
	this._debug("Removing Corner Judge from system");
	parent.remove.call(this);
};

CornerJudge.prototype._debug = function (msg) {
	console.log("[Corner Judge] " + msg);
};


exports.CornerJudge = CornerJudge;
