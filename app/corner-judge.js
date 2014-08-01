
// Modules
var config = require('config');


function CornerJudge(primus) {
	this.primus = primus;
	this.connected = true;
}

CornerJudge.prototype = {
	
	
	disconnected: function () {
		this.connected = false;
	}
	
};

exports.CornerJudge = CornerJudge;
