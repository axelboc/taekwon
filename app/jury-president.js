
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('jp');
var util = require('util');
var DB = require('./lib/db');
var User = require('./user').User;

var INBOUND_SPARK_EVENTS = ['openRing', 'addSlot', 'removeSlot', 'authoriseCJ', 'rejectCJ', 'removeCJ',
							'createMatch', 'endMatch', 'enableScoring'];


/**
 * Jury President.
 * @param {String} id
 * @param {Spark} spark - the spark or `null` if the user is being restored from the database
 * @param {Boolean} connected
 */
function JuryPresident(id, spark, connected) {
	// Call parent constructor and assert arguments
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
	parent._initSpark.call(this, spark, INBOUND_SPARK_EVENTS);
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
		ringSlotCount: this.ring ? this.ring.slotCount : -1,
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
		
		var match = this.ring.match;
		if (match) {
			data.match = {};
		}
	}
	
	// Send restore session event with all the required data
	this.spark.emit('restoreSession', data);
};


/*
 * ==================================================
 * Inbound spark events:
 * - assert spark event data
 * - propagate to Tournament and Ring via events
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
	
	this.emit('openRing', this, data.index);
};

/**
 * Add a Corner Judge slot.
 */
JuryPresident.prototype._onAddSlot = function () {
	this.emit('addSlot');
};

/**
 * Remove a Corner Judge slot.
 */
JuryPresident.prototype._onRemoveSlot = function () {
	this.emit('removeSlot');
};

/**
 * Authorise a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to authorise
 */
JuryPresident.prototype._onAuthoriseCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('authoriseCJ', data.id);
	logger.debug("> Corner Judge authorised");
};

/**
 * Reject a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to reject
 */
JuryPresident.prototype._onRejectCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('rejectCJ', data.id);
};

/**
 * Remove a Corner Judge from the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to remove
 */
JuryPresident.prototype._onRemoveCJ = function (data) {
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	this.emit('removeCJ', data.id);
};

/**
 * Create a new match.
 */
JuryPresident.prototype._onCreateMatch = function () {
	this.emit('createMatch');
};

/**
 * End the match.
 */
JuryPresident.prototype._onEndMatch = function () {
	this.emit('endMatch');
};

/**
 * Enable or disable scoring on the ring.
 * @param {Object}  data
 * 		  {Boolean} data.enable - `true` to enable; `false` to disable
 */
JuryPresident.prototype._onEnableScoring = function (data) {
	assert.object(data, 'data');
	assert.boolean(data.enable, 'data.enable');
	
	this.emit('enableScoring', data.enable);
};


/*
 * ==================================================
 * Outbound spark events:
 * - functions called from Ring module
 * ==================================================
 */

/**
 * The state of a ring has changed.
 * @param {Array} ringStates
 */
JuryPresident.prototype.ringStateChanged = function (ringStates) {
	assert.array(ringStates, 'ringStates');
	
	// Only send the updated ring states if the Jury President has not opened a ring yet and is connected
	if (!this.ring && this.connected) {
		this.spark.emit('ringStateChanged', {
			ringStates: ringStates
		});
	}
};

/**
 * The ring has been opened.
 * @param {Ring} ring
 * @param {Array} slots
 */
JuryPresident.prototype.ringOpened = function (ring, slots) {
	assert.provided(ring, 'ring');
	assert.array(slots, 'slots');
	
	this.ring = ring;
	
	if (this.connected) {
		this.spark.emit('ringOpened', {
			index: ring.index,
			slotCount: ring.slotCount,
			slots: slots
		});
	}
};

/**
 * A Corner Judge slot has been added or removed from the ring.
 * @param {Array} slots
 */
JuryPresident.prototype.slotsUpdated = function (slots) {
	assert.array(slots, 'slots');
	
	if (this.connected) {
		this.spark.emit('slotsUpdated', {
			slots: slots
		});
	}
};

/**
 * A Corner Judge slot could not be removed from the ring.
 * @param {String} reason - the reason for the error
 */
JuryPresident.prototype.slotNotRemoved = function (reason) {
	assert.string(reason, 'reason');
	
	if (this.connected) {
		this.spark.emit('slotNotRemoved', {
			reason: reason
		});
	}
};

/**
 * A new match has been created.
 */
JuryPresident.prototype.matchCreated = function () {
	if (this.connected) {
		this.spark.emit('matchCreated');
	}
};

/**
 * The match has been ended.
 */
JuryPresident.prototype.matchEnded = function () {
	if (this.connected) {
		this.spark.emit('matchEnded');
	}
};

/**
 * A Corner Judge has scored.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
JuryPresident.prototype.cjScored = function (cj, score) {
	assert.provided(cj, 'cj');
	assert.provided(score, 'score');
	
	if (this.connected) {
		this.spark.emit('cjScored', {
			id: cj.id,
			score: score
		});
	}
};

/**
 * A Corner Judge has undone a previous score.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
JuryPresident.prototype.cjUndid = function (cj, score) {
	assert.provided(cj, 'cj');
	assert.provided(score, 'score');
	
	if (this.connected) {
		this.spark.emit('cjUndid', {
			id: cj.id,
			score: score
		});
	}
};

/**
 * A Corner Judge has exited the system.
 * @param {CornerJudge} cj
 */
JuryPresident.prototype.cjExited = function (cj) {
	assert.provided(cj, 'cj');
	
	if (this.connected) {
		this.spark.emit('cjExited', {
			id: cj.id
		});
	}
};


exports.JuryPresident = JuryPresident;
