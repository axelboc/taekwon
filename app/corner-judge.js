
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function CornerJudge(primus, spark, sessionId, name) {
	// Call parent constructor
	User.apply(this, arguments);
	this.name = name;
}

// Inherit from User
util.inherits(CornerJudge, User);


CornerJudge.prototype.restoreSession = function (spark) {
	this.spark = spark;
};
	
CornerJudge.prototype.disconnected = function () {
	this.connected = false;
};


exports.CornerJudge = CornerJudge;
