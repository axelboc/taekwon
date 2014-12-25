
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('user');
var util = require('util');
var EventEmitter = require('events').EventEmitter;


/**
 * User of the application.
 * JuryPresident and CornerJudge inherit from this prototype.
 * @param {String} id
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {Boolean} connected
 */
function User(id, spark, connected) {
	assert.string(id, 'id');
	assert.provided(spark, 'spark');
	assert.boolean(connected, 'connected');
	
	this.id = id;
	if (spark) {
		this._initSpark(spark);
	}
	
	this.connected = connected;
	this.ring = null;
}

// Inherit EventEmitter
util.inherits(User, EventEmitter);

User.prototype = {
	
	/**
	 * Register event handlers on the spark.
	 * @param {Spark} spark
	 * @param {Array} events
	 */
	_initSpark: function (spark, events) {
		assert.provided(spark, 'spark');
		assert.array(events, 'events');
		
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
	 * The user's session has been restored.
	 */
	_onSessionRestored: function () {
		logger.debug("> Session restored");
		this.connected = true;
		this.emit('conntected');
	},
	
	/**
	 * The user is disconnected.
	 */
	disconnected: function () {
		logger.debug("Disconnected");
		this.connected = false;
		this.emit('disconnected');
	},
	
	/**
	 * Exit the system.
	 */
	exit: function () {
		this.connected = false;
		logger.info('exit', {
			id: this.id,
			name: this.name
		});
	}
	
};

exports.User = User;
