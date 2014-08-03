
function User(tournament, primus, spark, sessionId) {
	this.tournament = tournament;
	this.primus = primus;
	this.initSpark(spark);
	this.id = sessionId;
	this.connected = true;
	this.ring = null;
}

User.prototype = {
	
	initSpark: function (spark) {
		this.spark = spark;
	},
	
	restoreSession: function (spark) {
		this.initSpark(spark);
		
		// Prepare restoration data
		return {
			ringAllocations: this.tournament.getRingAllocations(),
			ringIndex: this.ring ? this.ring.index : -1
		};
	},
	
	disconnected: function () {
		this.connected = false;
	},
	
	remove: function () {
		
	}
	
};

exports.User = User;
