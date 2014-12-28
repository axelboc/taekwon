
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('user');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var SPARK_HANDLER_PREFIX = '_on';


/**
 * User of the application.
 * JuryPresident and CornerJudge inherit from this prototype.
 * @param {String} id
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {Boolean} connected
 */
function User(id, spark, connected) {
	assert.string(id, 'id');
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

/**
 * Register event handlers on the spark.
 * @param {Spark} spark
 * @param {Array} events
 */
User.prototype._initSpark = function (spark, events) {
	assert.provided(spark, 'spark');
	assert.array(events, 'events');

	// Store the spark
	this.spark = spark;

	// Add events shared by both user types
	events.push('sessionRestored');

	// Loop through the events and register their handlers
	events.forEach(function (evt) {
		this.spark.on(evt, this[SPARK_HANDLER_PREFIX + evt.charAt(0).toUpperCase() + evt.slice(1)].bind(this));
	}, this);
};

/**
 * The user's session has been restored.
 */
User.prototype._onSessionRestored = function () {
	logger.debug("> Session restored");
	this.connected = true;
	this.emit('connectionStateChanged', true);
};

/**
 * The user has been disconnected.
 */
User.prototype.disconnected = function () {
	logger.debug("Disconnected");
	this.connected = false;
	this.emit('connectionStateChanged', false);
};

/**
 * Exit the system.
 * Following a call to this function, all references to the user must be deleted from the system. 
 */
User.prototype.exit = function () {
	this.emit('exited', this);
	logger.info('exit', {
		id: this.id,
		name: this.name
	});
};

exports.User = User;
