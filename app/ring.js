
// Modules
var config = require('./config');


function Ring(index) {
	this.index = index;
	this.number = index + 1;
	this.roomId = 'ring' + index;
}

Ring.prototype = {
	
	
	
};

exports.Ring = Ring;
