
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
		this.initSpark(spark);
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
User.prototype.initSpark = function (spark, events) {
	assert.provided(spark, 'spark');
	assert.array(events, 'events');

	// Store the spark
	this.spark = spark;

	// Loop through the events and register their handlers
	events.forEach(function (evt) {
		this.spark.on(evt, this[SPARK_HANDLER_PREFIX + evt.charAt(0).toUpperCase() + evt.slice(1)].bind(this));
	}, this);
	
	// Mark user as connected
	this.connected = true;
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
 * @param {Array} ringStates
 */
User.prototype.idSuccess = function (ringStates) {
	assert.array(ringStates, 'ringStates');
	
	this._send('root.showView', { view: 'ringListView' });
	this._send('login.blurField');
	this._send('ringListView.updateList', { rings: ringStates });
};

/**
 * The state of a ring has changed.
 * @param {Array} ringStates
 */
User.prototype.ringStateChanged = function (ringStates) {
	assert.array(ringStates, 'ringStates');
	
	// Only send the updated ring states if the Jury President hasn't opened a ring yet
	if (!this.ring) {
		this._send('ringListView.updateList', { rings: ringStates });
	}
};

/**
 * The user has been disconnected.
 */
User.prototype.disconnected = function () {
	logger.debug("Disconnected");
	this.connected = false;
	this.emit('connectionStateChanged', this);
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
