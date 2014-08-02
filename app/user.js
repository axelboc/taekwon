
function User(primus, spark) {
	this.primus = primus;
	this.spark = spark;
	this.id = sessionId;
	this.connected = true;
	this.identified = false;
	
	// Listen for socket events
	
}

User.prototype = {
	
	restoreSession: function (spark) {
		this.spark = spark;
	},
	
	disconnected: function () {
		this.connected = false;
	}
	
};

exports.User = User;
