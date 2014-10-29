
// Modules
var assert = require('assert');


/**
 * User of the application.
 * JuryPresident and CornerJudge inherit from this prototype.
 * @param {Tournament} tournament
 * @param {Primus} primus
 * @param {Spark} spark
 * @param {String} sessionId
 */
function User(tournament, primus, spark, sessionId) {
	assert(tournament, "argument 'tournament' must be provided");
	assert(primus, "argument 'primus' must be provided");
	assert(spark, "argument 'spark' must be provided");
	assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
	
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
	
	/**
	 * Restore the user's session.
	 * This function is extended by child prototypes JuryPresident and CornerJudge.
	 * @param {Spark} spark - the user's new spark
	 * @return {Object} - an object containing the user's partial restoration data
	 */
	restoreSession: function (spark) {
		this._debug("Restoring session...");
		assert(spark, "argument 'spark' must be provided");
		
		// Initialise the new spark 
		this.initSpark(spark);
		
		// Return partial restoration data
		return {
			ringStates: this.tournament.getRingStates(),
			ringIndex: this.ring ? this.ring.index : -1
		};
	},

	/**
	 * The user's session has been restored.
	 */
	_onSessionRestored: function () {
		this._debug("> Session restored");
		this.connected = true;
		this.connectionStateChanged();
	},
	
	/**
	 * The user is disconnected.
	 */
	disconnected: function () {
		this._debug("Disconnected");
		this.connected = false;
		this.connectionStateChanged();
	},
	
	/**
	 * Exit the system.
	 */
	exit: function () {
		this._debug("Exit");
		this.connected = false;
	},

	_debug: function (msg) {
		console.log("[" + this.constructor.name + "] " + msg);
	}
	
};

exports.User = User;
