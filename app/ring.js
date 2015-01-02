
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('ring');
var util = require('./lib/util');
var DB = require('./lib/db');
var EventEmitter = require('events').EventEmitter;
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;
var Match = require('./match').Match;

var JP_HANDLER_PREFIX = '_jp';
var JP_EVENTS = ['addSlot', 'removeSlot', 'authoriseCJ','rejectCJ', 'removeCJ',
				 'createMatch', 'enableScoring',
				 'connectionStateChanged', 'exited'];

var CJ_HANDLER_PREFIX = '_cj';
var CJ_EVENTS = ['score', 'undo', 'connectionStateChanged', 'exited'];


/**
 * Ring.
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
	this.match = null;
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
 * Initialise the Jury President.
 * @param {JuryPresident} jp
 */
Ring.prototype.initJP = function (jp) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	
	this.juryPresident = jp;
	util.addEventListeners(this, jp, JP_EVENTS, JP_HANDLER_PREFIX);
};

/**
 * Open the ring by assigning it a Jury President.
 * @param {JuryPresident} jp
 */
Ring.prototype.open = function (jp) {
	assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
	assert.ok(!this.juryPresident, "ring is already open");

	// Update the database
	DB.setRingJPId(this.id, jp.id, function () {
		// Open ring
		this.initJP(jp);
		this.emit('stateChanged');
		
		// Acknowledge
		jp.ringOpened(this);
		
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
		// Ask Corner Judges to leave the ring
		this.cornerJudges.forEach(function (cj) {
			this._removeCJ(cj, "Ring closed");
		}, this);
		
		// Close ring
		util.removeEventListeners(this.juryPresident, JP_EVENTS);
		this.juryPresident = null;
		this.emit('stateChanged');
		
		logger.info('closed', {
			number: this.number
		});
	}.bind(this));
};

/**
 * Initialise a Corner Judge.
 * @param {CornerJudge} cj
 */
Ring.prototype.initCJ = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	
	this.cornerJudges.push(cj);
	util.addEventListeners(this, cj, CJ_EVENTS, CJ_HANDLER_PREFIX);
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
	assert.ok(this.cornerJudges.length <= this.slotCount, "more Corner Judges than slots");
	
	// Reject the Corner Judge if the ring is full
	if (this.cornerJudges.length === this.slotCount) {
		cj.rejected("Ring full");
		return;
	}
	
	// Update the database
	DB.addCJIdToRing(this.id, cj.id, function () {
		// Add Corner Judge to ring
		this.initCJ(cj);
		this.emit('cjAdded');

		// Request authorisation from Jury President
		this.juryPresident.cjAdded(cj);
		// Acknowledge
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
	assert.ok(this.juryPresident, "ring must have Jury President");
	
	// Update the database
	DB.pullCJIdFromRing(this.id, cj.id, function () {
		DB.setCJAuthorised(cj.id, false, function () {
			// Remove the Corner Judge from the ring
			this.cornerJudges.splice(index, 1);
			util.removeEventListeners(cj, CJ_EVENTS);
			this.emit('cjRemoved');

			// Acknowledge
			this.juryPresident.cjRemoved(cj);
			if (!cj.authorised) {
				cj.rejected(message);
			} else {
				cj.ringLeft(message);
			}

			logger.info('cjRemoved', {
				number: this.number,
				cjId: cj.id,
				cjName: cj.name,
				message: message
			});
		}.bind(this));
	}.bind(this));
};


/*
 * ==================================================
 * Jury President events
 * ==================================================
 */

/**
 * Add a Corner Judge slot.
 */
Ring.prototype._jpAddSlot = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	
	// Update the database
	DB.setRingSlotCount(this.id, this.slotCount + 1, function () {
		this.slotCount += 1;
		this.juryPresident.slotAdded();
	}.bind(this));
};

/**
 * Remove a Corner Judge slot.
 */
Ring.prototype._jpRemoveSlot = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.integerGt0(this.slotCount, 'slotCount');
	assert.ok(this.cornerJudges.length <= this.slotCount, "number of Corner Judges exceeds slot count");
	
	if (this.slotCount === 1) {
		this.juryPresident.slotError("The ring requires at least one Corner Judge.");
	} else if (this.cornerJudges.length === this.slotCount) {
		this.juryPresident.slotError("Please remove a Corner Judge before proceeding.");
	} else {
		// Update the database
		DB.setRingSlotCount(this.id, this.slotCount - 1, function () {
			this.slotCount -= 1;
			this.juryPresident.slotRemoved();
		}.bind(this));
	}
};

/**
 * A Corner Judge's request to join the ring has been authorised by the Jury President.
 * @param {String} id - the ID of the Corner Judge who has been authorised
 */
Ring.prototype._jpAuthoriseCJ = function (id) {
	assert.string(id, 'id');
	assert.ok(this.juryPresident, "ring must have Jury President");
	var cj = this._getCornerJudgeById(id);
	
	// Update the database
	DB.setCJAuthorised(id, true, function () {
		// Acknowledge
		cj.ringJoined();
		this.juryPresident.cjAuthorised(cj);
	}.bind(this));
};

/**
 * A Corner Judge's request to join the ring has been rejected by the Jury President.
 * @param {String} id - the ID of the Corner Judge who has been rejected
 */
Ring.prototype._jpRejectCJ = function (id) {
	assert.string(id, 'id');
	
	// Remove Corner Judge from ring
	this._removeCJ(this._getCornerJudgeById(id), "Not authorised to join ring");
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
 * Create a new match.
 */
Ring.prototype._jpCreateMatch = function () {
	// Insert a new match in the database
	DB.insertMatch(this.id, function (newDoc) {
		if (newDoc) {
			// Create the match
			this.match = new Match(newDoc._id);
			logger.debug("Match created");
			
			// Acknowledge
			this.juryPresident.matchCreated();
		}
	}.bind(this));
};

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
 * The connection state of the Jury President has changed.
 */
Ring.prototype._jpConnectionStateChanged = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.array(this.cornerJudges, 'cornerJudges');

	// Notify Corner Judges
	var connected = this.juryPresident.connected;
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
 * A Corner Judge has scored.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
Ring.prototype._cjScore = function (cj, score) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.provided(score, 'score');
	assert.ok(this.juryPresident, "ring must have Jury President");

	this.juryPresident.cjScored(cj, score);
	cj.scored(score);
};

/**
 * A Corner Judge has undone a previous score.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
Ring.prototype._cjUndo = function (cj, score) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.provided(score, 'score');
	assert.ok(this.juryPresident, "ring must have Jury President");

	this.juryPresident.cjUndid(cj, score);
	cj.undid(score);
};

/**
 * The connection state of a Corner Judge has changed.
 * @param {CornerJudge} cj
 */
Ring.prototype._cjConnectionStateChanged = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");

	// Notify Jury President
	this.juryPresident.cjConnectionStateChanged(cj.id, cj.connected);
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
