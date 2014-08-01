
// Modules
var config = require('config');


function JuryPresident(primus) {
	this.primus = primus;
	this.connected = true;
}

JuryPresident.prototype = {
	
	
	disconnected: function () {
		this.connected = false;
	}
	
};

exports.JuryPresident = JuryPresident;
