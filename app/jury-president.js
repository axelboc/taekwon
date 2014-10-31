
// Modules
var util = require('util');
var config = require('./config');
var User = require('./user').User;


/**
 * Jury President.
 * @param {Tournament} tournament
 * @param {Primus} primus
 * @param {Spark} spark
 * @param {String} sessionId
 */
function JuryPresident(tournament, primus, spark, sessionId) {
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
JuryPresident.prototype.initSpark = function (spark) {
	// Call parent function, which will assert the argument
	parent.initSpark.call(this, spark);
	
	['openRing', 'enableScoring', 'authoriseCJ', 'rejectCJ', 'removeCJ'].forEach(function (evt) {
		this.spark.on(evt, this['_on' + evt.charAt(0).toUpperCase() + evt.slice(1)].bind(this));
	}, this);
};


/*
 * ==============================
 * Inbound spark events
 * ==============================
 */

/**
 * Open a ring.
 * @param {Object} data
 * 		  {Number} data.index - the index of the ring, as a positive integer
 */
JuryPresident.prototype._onOpenRing = function (data) {
	assert(typeof data === 'object', "argument 'data' must be an object");
	assert(typeof data.index === 'number' && data.index >= 0 && data.index % 1 === 0, 
		   "'data.index' must be a positive integer");
	
	// Retrieve the ring at the given index
	var ring = this.tournament.getRing(data.index);
	
	// Open the ring
	ring.open(this);
	this.ring = ring;

	// Acknowledge that the ring has been opened
	this.spark.emit('ringOpened', data.index);
	this._debug("Opened ring #" + (data.index + 1));
};

/**
 * Enable or disable scoring on the ring.
 * @param {Object}  data
 * 		  {Boolean} data.enable - `true` to enable; `false` to disable
 */
JuryPresident.prototype._onEnableScoring = function (data) {
	assert(typeof data === 'object', "argument 'data' must be an object");
	assert(typeof data.enable === 'boolean', "'data.enable' must be a boolean");
	assert(this.ring, "no ring opened");
	
	this.ring.enableScoring(data.enable);
};

/**
 * Authorise a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to authorise
 */
JuryPresident.prototype._onAuthoriseCJ = function (data) {
	assert(typeof data === 'object', "argument 'data' must be an object");
	assert(typeof data.id === 'string', "'data.id' must be a string");
	assert(this.ring, "no ring opened");
	
	this.ring.cjAuthorised(data.id);
};

/**
 * Reject a Corner Judge's request to join the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to reject
 * 		  {String} data.message - the reason for the rejection
 */
JuryPresident.prototype._onRejectCJ = function (data) {
	assert(typeof data === 'object', "argument 'data' must be an object");
	assert(typeof data.id === 'string', "'data.id' must be a string");
	assert(typeof data.message === 'string', "'data.message' must be a string");
	assert(this.ring, "no ring opened");
	
	this.ring.cjRejected(data.id, data.message);
};

/**
 * Remove a Corner Judge from the ring.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to remove
 */
JuryPresident.prototype._onRemoveCJ = function (data) {
	assert(typeof data === 'object', "argument 'data' must be an object");
	assert(typeof data.id === 'string', "'data.id' must be a string");
	assert(this.ring, "no ring opened");
	
	this.ring.cjRemoved(data.id);
};



JuryPresident.prototype.authoriseCJ = function (cj) {
	this._debug("Authorising Corner Judge to join ring");
	this.spark.emit('newCornerJudge', {
		id: cj.id,
		name: cj.name,
		connected: cj.connected
	});
};

JuryPresident.prototype.cjScored = function (cornerJudge, score) {
	score.judgeId = cornerJudge.id;
	this.spark.emit('cjScored', score);
};

JuryPresident.prototype.cjConnectionStateChanged = function (cornerJudge, connected) {
	this.spark.emit('cjConnectionStateChanged', {
		id: cornerJudge.id,
		connected: connected
	});
};

JuryPresident.prototype.cjExited = function (cornerJudge) {
	this.spark.emit('cjExited', cornerJudge.id);
};

JuryPresident.prototype.restoreSession = function (spark) {
	var data = parent.restoreSession.call(this, spark);
	data.cornerJudges = [];
	
	// Add corner judges
	if (this.ring) {
		this.ring.cornerJudges.forEach(function (judge) {
			data.cornerJudges.push({
				id: judge.id,
				name: judge.name,
				connected: judge.connected,
				authorised: judge.authorised
			});
		}, this);
	}
	
	// Send session restore event with all the required data
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


exports.JuryPresident = JuryPresident;
