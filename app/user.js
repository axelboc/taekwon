
// Modules
var assert = require('assert');


/**
 * User of the application.
 * JuryPresident and CornerJudge inherit from this prototype.
 * @param {Tournament} tournament
 * @param {Primus} primus
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {String} sessionId
 */
function User(tournament, primus, spark, sessionId) {
	assert(tournament, "argument 'tournament' must be provided");
	assert(primus, "argument 'primus' must be provided");
	assert(typeof sessionId === 'string', "argument 'sessionId' must be a string");
	
	this.tournament = tournament;
	this.primus = primus;
	this.id = sessionId;
	
	if (spark) {
		this.initSpark(spark);
	}
	
	this.connected = true;
	this.ring = null;
}

User.prototype = {
	
	/**
	 * Register event handlers on the spark.
	 * @param {Spark} spark
	 * @param {Array} events
	 */
	initSpark: function (spark, events) {
		assert(spark, "argument 'spark' must be provided");
		assert(Array.isArray(events), "argument 'events' must be an array");
		
		// Store the spark
		this.spark = spark;
		
		// Add events shared by both user types
		events.push('sessionRestored');
		
		// Loop through the events and register their handlers
		events.forEach(function (evt) {
			this.spark.on(evt, this['_on' + evt.charAt(0).toUpperCase() + evt.slice(1)].bind(this));
		}, this);
	},
	
	/**
	 * Restore the user's session.
	 * This function is extended by child prototypes JuryPresident and CornerJudge.
	 * @param {Spark} spark - the user's new spark
	 * @return {Object} - an object containing the user's partial restoration data
	 */
	restoreSession: function (spark) {
		assert(spark, "argument 'spark' must be provided");
		this._log('debug', "Restoring session...");
		
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
		this._log('debug', "> Session restored");
		this.connected = true;
		this.connectionStateChanged();
	},
	
	/**
	 * The user is disconnected.
	 */
	disconnected: function () {
		this._log('debug', "Disconnected");
		this.connected = false;
		this.connectionStateChanged();
	},
	
	/**
	 * Exit the system.
	 */
	exit: function () {
		this.connected = false;
		this._log('exit', {
			id: this.id,
			name: this.name
		});
	}
	
};

exports.User = User;
