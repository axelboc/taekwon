
function User(tournament, primus, spark, sessionId) {
	this.tournament = tournament;
	this.primus = primus;
	this.initSpark(spark);
	this.id = sessionId;
	
	this.connected = true;
	this.ring = null;
}

User.prototype = {
	
	/**
	 * Register event handlers on the spark.
	 * @param {Spark} spark
	 */
	initSpark: function (spark) {
		assert(spark, "argument 'spark' must be provided");
		
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
	
	disconnect: function () {
		this._debug("Disconnecting");
		this.connected = false;
		this.connectionStateChanged();
	},
	
	exit: function () {
		this._debug("Exiting");
		this.connected = false;
	},

	_debug: function (msg) {
		console.log("[" + this.constructor.name + "] " + msg);
	}
	
};

exports.User = User;
