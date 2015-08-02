'use strict';

// Modules
var assert = require('./lib/assert');
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
	this.connected = connected;
	
	if (spark) {
		this.initSpark(spark);
	}
}

// Inherit EventEmitter
util.inherits(User, EventEmitter);

/**
 * Register event handlers on the spark.
 * If a handler is not provided, simply forward the spark event with EvenEmitter.
 * @param {Spark} spark
 * @param {Array} events
 */
User.prototype.initSpark = function (spark, events) {
	assert.provided(spark, 'spark');
	assert.array(events, 'events');

	// Store the spark
	this.spark = spark;

	// Loop through the events and register their handlers
	events.forEach(function (evt) {
		// Look for a handler
		var handler = this[SPARK_HANDLER_PREFIX + evt.charAt(0).toUpperCase() + evt.slice(1)];
		
		// Use the handler if found or register EventEmitter's emit method
		this.spark.on(evt, handler ? handler.bind(this) : this.emit.bind(this, evt));
	}, this);
	
	// Mark user as connected
	this.connected = true;
	this._send('io.hideBackdrop');
	this.emit('connectionStateChanged', this);
};

/**
 * Send a spark event to the client.
 * @param {String} event
 * @param {Object} data - optional data to send
 */
User.prototype._send = function (event, data) {
	assert.string(event, 'event');
	assert.ok(typeof data === 'undefined' || typeof data === 'object' && data,
			  "if provided, `data` must be an object");
	
	if (this.connected) {
		this.spark.emit(event, data);
	}
};


/* ==================================================
 * Outbound spark events
 * ================================================== */

/**
 * The user has been successfully identified.
 */
User.prototype.idSuccess = function () {
	this._send('io.saveId', { id: this.id });
	this._send('login.blurField');
	this._send('root.showView', { view: 'ringListView' });
};

/**
 * The user has been disconnected.
 */
User.prototype.disconnected = function () {
	this.connected = false;
	this.logger.info('disconnected');
	this.emit('connectionStateChanged', this);
};

/**
 * Exit the system.
 * Following a call to this function, all references to the user must be deleted from the system. 
 */
User.prototype.exit = function () {
	this.logger.info('exited');
	this.emit('exited', this);
};

module.exports.User = User;
