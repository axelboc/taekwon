
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
		spark.on('sessionRestored', this._onSessionRestored.bind(this));
	},
	
	restoreSession: function (spark) {
		this._debug("Restoring session");
		this.initSpark(spark);
		
		// Prepare restoration data
		return {
			ringStates: this.tournament.getRingStates(),
			ringIndex: this.ring ? this.ring.index : -1
		};
	},

	_onSessionRestored: function () {
		this._debug("> Session restored");
		this.connected = true;
		this.connectionStateChanged();
	},
	
	disconnected: function () {
		this._debug("Disconnected");
		this.connected = false;
		this.connectionStateChanged();
	},
	
	remove: function () {
		this._debug("Removing from system");
		
	},

	_debug: function (msg) {
		console.log("[" + this.constructor + "] " + msg);
	}
	
};

exports.User = User;
