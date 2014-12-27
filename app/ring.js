
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('ring');
var util = require('./lib/util');
var DB = require('./lib/db');
var EventEmitter = require('events').EventEmitter;
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;

var JP_EVENTS = ['enableScoring', 'authoriseCJ','rejectCJ', 'removeCJ', 'connectionStateChanged', 'exited'];
var JP_HANDLER_PREFIX = '_jp';

var CJ_EVENTS = ['connectionStateChanged', 'exited'];
var CJ_HANDLER_PREFIX = '_cj';


/**
 * Ring.
 * @param {Primus} primus
 * @param {String} id
 * @param {Number} index - the ring index, as a positive integer
 * @param {Number} slotCount - the number of Corner Judge slots available
 */
function Ring(id, index, slotCount) {
	assert.string(id, 'id');
	assert.integerGte0(index, 'index');
	assert.integerGt0(slotCount, 'slotCount');
	
	this.id = id;
	this.index = index;
	this.slotCount = slotCount;
	
	this.number = index + 1;
	this.juryPresident = null;
	this.cornerJudges = [];
	this.scoringEnabled = false;
}

// Inherit EventEmitter
util.inherits(Ring, EventEmitter);

/**
 * Return an object representing the state of the ring (open/close).
 * @return {Array}
 */
Ring.prototype.getState = function () {
	return {
		index: this.index,
		number: this.number,
		open: this.juryPresident !== null
	};
};

/**
 * Return the ring's Corner Judge with the given ID.
 * The function throws if the ID is not associated with exactly one Corner Judge.
 * @private
 * @param {String} id
 * @return {CornerJudge}
 */
Ring.prototype._getCornerJudgeById = function (id) {
	assert.string(id, 'id');

	// Find the Corner Judge with the given ID
	var cornerJudge = this.cornerJudges.filter(function (cj) {
		return cj.id === id;
	}, this);

	assert.ok(cornerJudge.length > 0, 
		   "no Corner Judge with ID=" + id + " in ring #" + this.number);
	assert.ok(cornerJudge.length === 1, cornerJudge.length + 
		   " Corner Judges share the same ID=" + id + " in ring #" + this.number);

	return cornerJudge[0];
};

/**
 * Open the ring by assigning it a Jury President.
 * @param {JuryPresident} jp
 */
Ring.prototype.open = function (jp) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	assert.ok(!this.juryPresident, "ring is already open");

	// Update the database
	DB.setRingJPId(this.id, this.juryPresident.id, function () {
		// Add events listeners
		util.addEventListeners(this, jp, JP_EVENTS, JP_HANDLER_PREFIX);
		
		// Open ring
		this.juryPresident = jp;
		this.juryPresident.ringOpened(this);
		this.emit('stateChanged');
		
		logger.info('opened', {
			number: this.number,
			jpId: jp.id
		});
	}.bind(this));
};

/**
 * Close the ring.
 */
Ring.prototype._close = function () {
	assert.ok(this.juryPresident, "ring is already closed");
	
	// Update the database
	DB.setRingJPId(this.id, null, function () {
		// Remove event listeners
		util.removeEventListeners(this.juryPresident, JP_EVENTS);
		
		// Ask Corner Judges to leave the ring
		this.cornerJudges.forEach(function (cj) {
			this._removeCJ(cj, "Ring closed");
		}, this);
		
		// Close ring
		this.juryPresident = null;
		this.emit('stateChanged');
		
		logger.info('closed', {
			number: this.number
		});
	}.bind(this));
};

/**
 * Add a Corner Judge to the ring.
 * @param {CornerJudge} cj
 */
Ring.prototype.addCJ = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.array(this.cornerJudges, 'cornerJudges');
	assert.ok(this.cornerJudges.indexOf(cj) === -1, "Corner Judge is already in the ring");
	
	// Update the database
	DB.addCJIdToRing(this.id, cj.id, function () {
		// Add Corner Judge to ring
		this.cornerJudges.push(cj);
		util.addEventListeners(this, cj, CJ_EVENTS, CJ_HANDLER_PREFIX);
		this.emit('cjAdded');

		// Request authorisation from Jury President
		this.juryPresident.cjAdded(cj);
		cj.waitingForAuthorisation(this);

		logger.info('cjAdded', {
			number: this.number,
			cjId: cj.id,
			cjName: cj.name
		});
	}.bind(this));
};

/**
 * Remove a Corner Judge from the ring.
 * @param {String|CornerJudge} cj - the ID of the Corner Judge or the CornerJudge object to remove
 * @param {String} message - the reason for the removal, which will be shown to the Corner Judge
 */
Ring.prototype._removeCJ = function (cj, message) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.string(message, 'message');
	var index = this.cornerJudges.indexOf(cj);
	assert.ok(index > -1, "Corner Judge is not in the ring");
	
	// Update the database
	DB.pullCJIdFromRing(this.id, cj.id, function () {
		// Remove the Corner Judge from the ring
		this.cornerJudges.splice(index, 1);
		util.removeEventListeners(cj, CJ_EVENTS);
		this.emit('cjRemoved');

		// Acknowledge removal
		cj.ringLeft(message);

		logger.info('cjRemoved', {
			number: this.number,
			cjId: cj.id,
			cjName: cj.name,
			message: message
		});
	}.bind(this));
};


/*
 * ==================================================
 * Jury President events
 * ==================================================
 */

/**
 * Enable/disable scoring.
 * @param {Boolean} enable - `true` to enable; `false` to disable
 */
Ring.prototype._jpEnableScoring = function (enable) {
	assert.boolean(enable, 'enable');
	assert.array(this.cornerJudges, 'cornerJudges');

	this.scoringEnabled = enable;

	// Notify Corner Judges
	this.cornerJudges.forEach(function (cj) {
		cj.scoringStateChanged(enable);
	}, this);
};

/**
 * A Corner Judge's request to join the ring has been authorised by the Jury President.
 * @param {String} id
 */
Ring.prototype._jpAuthoriseCJ = function (id) {
	assert.string(id, 'id');
	
	// Notify the Corner Judge
	var cj = this._getCornerJudgeById(id);
	cj.ringJoined();
};

/**
 * A Corner Judge's request to join the ring has been rejected by the Jury President.
 * @param {String} id - the ID of the Corner Judge who has been authorised
 * @param {String} message - the reason for the rejection
 */
Ring.prototype._jpRejectCJ = function (id, message) {
	assert.string(id, 'id');
	assert.string(message, 'message');

	// Remove Corner Judge from ring
	this._removeCJ(this._getCornerJudgeById(id), message);
};

/**
 * A Corner Judge has been removed from the ring by the Jury President.
 * @param {String} id - the ID of the Corner Judge who has been removed
 */
Ring.prototype._jpRemoveCJ = function (id) {
	assert.string(id, 'id');

	// Remove Corner Judge from ring
	this._removeCJ(this._getCornerJudgeById(id), "Removed from ring");
};

/**
 * The connection state of the Jury President has changed.
 * @param {Boolean} connected
 */
Ring.prototype._jpConnectionStateChanged = function (connected) {
	assert.boolean(connected, 'connected');
	assert.array(this.cornerJudges, 'cornerJudges');

	// Notify Corner Judges
	this.cornerJudges.forEach(function (cj) {
		cj.jpConnectionStateChanged(connected);
	}, this);
};

/**
 * The Jury President exited the system.
 */
Ring.prototype._jpExited = function () {
	// Close the ring
	this._close();
};


/*
 * ==================================================
 * Corner Judge events
 * ==================================================
 */

/**
 * A Corner Judge has scored or undone a previous score.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
Ring.prototype._cjScore = function (cj, score) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");

	// Notify Jury President
	this.juryPresident.cjScored(cj, score);
};

/**
 * The connection state of a Corner Judge has changed.
 * @param {String} id
 * @param {Boolean} connected
 */
Ring.prototype._cjConnectionStateChanged = function (id, connected) {
	assert.string(id, 'id');
	assert.boolean(connected, 'connected');
	assert.ok(this.juryPresident, "ring must have Jury President");

	// Notify Jury President
	this.juryPresident.cjConnectionStateChanged(id, connected);
};

/**
 * A Corner Judge has exited the system.
 * @param {CornerJudge} cj
 */
Ring.prototype._cjExited = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");

	// Remove Corner Judge from ring
	this._removeCJ(cj, "Exited system");

	// Notify Jury President
	this.juryPresident.cjExited(cj);
};

exports.Ring = Ring;
