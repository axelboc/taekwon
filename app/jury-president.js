
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('jp');
var util = require('util');
var User = require('./user').User;
var CornerJudge = require('./corner-judge').CornerJudge;


/**
 * Jury President.
 * @param {String} id
 * @param {Spark} spark
 */
function JuryPresident(id, spark) {
	// Call parent constructor, which will assert the arguments
	User.apply(this, arguments);
}

// Inherit from User
util.inherits(JuryPresident, User);
// Keep a pointer to the parent prototype
parent = JuryPresident.super_.prototype;


/**
 * Register event handlers on the spark.
 * @param {Spark} spark
 */
JuryPresident.prototype._initSpark = function (spark) {
	// Call parent function
	parent._initSpark.call(this, spark, ['openRing', 'enableScoring', 'authoriseCJ', 'rejectCJ', 'removeCJ']);
};

/**
 * Restore the Jury President's session.
 * @param {Spark} spark - the spark of the new socket connection
 * @param {Array} ringStates
 */
JuryPresident.prototype.restoreSession = function (spark, ringStates) {
	assert.provided(spark, 'spark');
	assert.array(ringStates, 'ringStates');
	logger.debug("Restoring session...");

	// Initialise the new spark 
	this._initSpark(spark);
	
	// Prepare restoratio data
	var data = {
		ringStates: ringStates,
		ringIndex: this.ring ? this.ring.index : -1,
		cornerJudges: []
	};
	
	// Add corner judges
	if (this.ring) {
		assert.array(this.ring.cornerJudges, 'cornerJudges');
		this.ring.cornerJudges.forEach(function (judge) {
			data.cornerJudges.push({
				id: judge.id,
				name: judge.name,
				connected: judge.connected,
				authorised: judge.authorised
			});
		}, this);
	}
	
	// Send restore session event with all the required data
	this.spark.emit('restoreSession', data);
};

JuryPresident.prototype.connectionStateChanged = function () {
	if (this.ring) {
		// Let Corner Judges know that Jury President is disconnected/reconnected
		this.ring.jpConnectionStateChanged(this.connected);
	}
};

JuryPresident.prototype.exit = function () {
	parent.exit.call(this);
	
	// Close ring
	if (this.ring) {
		this.ring.close();
		this.ring = null;
	}
};


/*
 * ==================================================
 * Inbound spark events:
 * - propagate to Ring via direct function calls
 * - acknowledge if required
 * ==================================================
 */

/**
 * Open a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
JuryPresident.prototype._onOpenRing = function (data) {
	assert.object(data, 'data');
	assert.integerGte0(data.index, 'data.index');
	assert.ok(!this.ring, "already in a ring");
	
	this.emit('openRing', this, data.index);
};

/**
 * Enable or disable scoring on the ring.
 * @param {Object}  data
 * 		  {Boolean} data.enable - `true` to enable; `false` to disable
 */
JuryPresident.prototype._onEnableScoring = function (data) {
	assert.object(data, 'data');
	assert.boolean(data.enable, 'data.enable');
	assert.ok(this.ring, "no ring opened");
	
	this.ring.enableScoring(data.enable);
};

/**
 * Authorise a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to authorise
 */
JuryPresident.prototype._onAuthoriseCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	assert.ok(this.ring, "no ring opened");
	
	this.ring.cjAuthorised(data.id);
	logger.debug("> Corner Judge authorised");
};

/**
 * Reject a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to reject
 * 		  {String} data.message - the reason for the rejection
 */
JuryPresident.prototype._onRejectCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	assert.string(data.message, 'data.message');
	assert.ok(this.ring, "no ring opened");
	
	this.ring.cjRejected(data.id, data.message);
};

/**
 * Remove a Corner Judge from the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to remove
 */
JuryPresident.prototype._onRemoveCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	assert.ok(this.ring, "no ring opened");
	
	this.ring.cjRemoved(data.id);
};


/*
 * ==================================================
 * Outbound spark events:
 * - received from Ring via direct function calls
 * ==================================================
 */

/**
 * The ring has been opened.
 * @param {Ring} ring
 */
JuryPresident.prototype.ringOpened = function (ring) {
	assert.provided(ring, 'ring');
	
	this.ring = ring;
	this.spark.emit('ringOpened', {
		index: ring.index
	});
};

/**
 * A Corner Judge has been added to the ring.
 * Before it can officially join the ring, the Jury President must give its authorisation.
 * @param {Corner Judge} cj
 */
JuryPresident.prototype.cjAdded = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	logger.debug("Authorising Corner Judge to join ring...");
	
	this.spark.emit('cjAdded', {
		id: cj.id,
		name: cj.name,
		connected: cj.connected
	});
};

/**
 * A Corner Judge has scored.
 * @param {Corner Judge} cj
 * @param {Object} score
 */
JuryPresident.prototype.cjScored = function (cj, score) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	// Add Corner Judge ID to data to transmit
	score.judgeId = cj.id;
	
	this.spark.emit('cjScored', score);
};

/**
 * The connection state of a Corner Judge has changed.
 * @param {Corner Judge} cj
 * @param {Boolean} connected - `true` if the Corner Judge is now connected; `false` if it is disconnected
 */
JuryPresident.prototype.cjConnectionStateChanged = function (cj, connected) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.boolean(connected, 'connected');
	
	this.spark.emit('cjConnectionStateChanged', {
		id: cj.id,
		connected: connected
	});
};

/**
 * A Corner Judge has exited the system.
 * @param {Corner Judge} cj
 */
JuryPresident.prototype.cjExited = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	this.spark.emit('cjExited', {
		id: cj.id
	});
};


exports.JuryPresident = JuryPresident;
