
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


function JuryPresident(primus, spark, sessionId) {
	// Call parent constructor
	User.apply(this, arguments);
}

// Inherit from User
util.inherits(JuryPresident, User);


exports.JuryPresident = JuryPresident;
