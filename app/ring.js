
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
var JP_EVENTS = ['addSlot', 'removeSlot', 'authoriseCJ',
				 'setConfigItem', 'createMatch', 'endMatch', 'enableScoring',
				 'startMatchState', 'endMatchState', 'startEndInjury',
				 'connectionStateChanged'];

var CJ_HANDLER_PREFIX = '_cj';
var CJ_EVENTS = ['score', 'undo', 'connectionStateChanged'];

var MATCH_HANDLER_PREFIX = '_match';
var MATCH_EVENTS = ['stateChanged', 'resultsComputed', 'ended'];


/**
 * Ring.
 * @param {String} id
 * @param {Number} index - the ring index, as a positive integer
 * @param {Number} slotCount - the number of Corner Judge slots available
 * @param {Object} matchConfig - the default match configuration
 */
function Ring(id, index, slotCount, matchConfig) {
	assert.string(id, 'id');
	assert.integerGte0(index, 'index');
	assert.integerGt0(slotCount, 'slotCount');
	assert.object(matchConfig, 'matchConfig');
	
	this.id = id;
	this.index = index;
	this.slotCount = slotCount;
	this.matchConfig = matchConfig;
	
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
 * Return and array of objects representing the ring's slots.
 * @param {Function} customFunc - optional function used to retrieve custom data about each Corner Judge
 * @return {Array}
 */
Ring.prototype.getSlots = function (customFunc) {
	assert.ok(typeof customFunc === 'undefined' || typeof customFunc === 'function', 
			  "if provided, `customFunc` must be a function");
	
	var slots = [];
	for (var i = 0, len = this.slotCount; i < len; i += 1) {
		var cj = this.cornerJudges[i];
		slots.push({
			index: i + 1,
			cj: !cj ? null : (customFunc ? customFunc(cj) : cj.getState())
		});
	}
	return slots;
};

Ring.prototype.getScoreSlots = function () {
	assert.ok(this.match, "ring must have a match");
	
	return this.getSlots(function (cj) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		
		var obj = cj.getState();
		obj.scores = this.match.getScores(cj.id);
		return obj;
	}.bind(this));
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
		jp.ringOpened(this, this.matchConfig, this.getSlots());
		
		logger.info('opened', {
			number: this.number,
			jpId: jp.id
		});
	}.bind(this));
};

/**
 * Close the ring.
 * @param {Array} ringStates
 */
Ring.prototype.close = function (ringStates) {
	assert.array(ringStates, 'ringStates');
	assert.ok(this.juryPresident, "ring is already closed");
	
	// Update the database
	DB.setRingJPId(this.id, null, function () {
		// Ask Corner Judges to leave the ring
		this.cornerJudges.forEach(function (cj) {
			this.removeCJ(cj, "Ring closed", ringStates);
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
 * Test if the ring is full.
 * @return {Boolean}
 */
Ring.prototype.isFull = function () {
	assert.array(this.cornerJudges, 'cornerJudges');
	assert.ok(this.cornerJudges.length <= this.slotCount, "more Corner Judges than slots");
	return (this.cornerJudges.length === this.slotCount);
};

/**
 * Add a Corner Judge to the ring.
 * @param {CornerJudge} cj
 */
Ring.prototype.addCJ = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.ok(this.cornerJudges.indexOf(cj) === -1, "Corner Judge is already in the ring");
	
	// Update the database
	DB.addCJIdToRing(this.id, cj.id, function () {
		// Add Corner Judge to ring
		this.initCJ(cj);
		this.emit('cjAdded');

		// Request authorisation from Jury President
		this.juryPresident.slotsUpdated(this.getSlots(), this.match ? this.getScoreSlots() : null);
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
 * @param {Array} ringStates
 */
Ring.prototype.removeCJ = function (cj, message, ringStates) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.string(message, 'message');
	assert.array(ringStates, 'ringStates');
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
			this.juryPresident.slotsUpdated(this.getSlots(), this.match ? this.getScoreSlots() : null);
			if (!cj.authorised) {
				cj.rejected(message, ringStates);
			} else {
				cj.ringLeft(message, ringStates);
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

/**
 * Instanciate and initialise a new match object based on a database document.
 * @param {Object} doc
 * @param {Function} cb
 */
Ring.prototype._initMatch = function (doc, cb) {
	assert.object(doc, 'doc');
	
	this.match = new Match(doc._id, doc.config);
	util.addEventListeners(this, this.match, MATCH_EVENTS, MATCH_HANDLER_PREFIX);
	
	this.match.nextState();
};

/**
 * Restore the ring's match, if applicable.
 * @param {Function} cb
 */
Ring.prototype.restoreMatch = function (cb) {
	assert.function(cb, 'cb');
	
	DB.findMatchInProgress(this.id, function (doc) {
		if (doc) {
			this._initMatch(doc);
			logger.debug("> Match restored");
		}
		cb();
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
		this.juryPresident.slotsUpdated(this.getSlots(), this.match ? this.getScoreSlots() : null);
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
		this.juryPresident.slotNotRemoved("The ring must have at least one Corner Judge.");
	} else if (this.cornerJudges.length === this.slotCount) {
		this.juryPresident.slotNotRemoved("Please remove a Corner Judge before proceeding.");
	} else {
		// Update the database
		DB.setRingSlotCount(this.id, this.slotCount - 1, function () {
			this.slotCount -= 1;
			this.juryPresident.slotsUpdated(this.getSlots(), this.match ? this.getScoreSlots() : null);
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
		this.juryPresident.slotsUpdated(this.getSlots(), this.match ? this.getScoreSlots() : null);
	}.bind(this));
};

/**
 * Set the value of a configuration item.
 * @param {String} name - the name of the configuration item
 * @param {Any} value - the new value (type depends on type of config item)
 */
Ring.prototype._jpSetConfigItem = function (name, value) {
	assert.string(name, 'name');
	assert.ok(this.juryPresident, "ring must have Jury President");
	
	var item = this.matchConfig[name];
	assert.object(item, "configuration item not found");
	
	// Assert `value` according to the type of the configuration item
	switch (item.type) {
		case 'time':
			assert.integer(value, 'value');
			assert.ok(item.value + value > 0, "value of time configuration item must remain greater than 0");
			value = item.value + value;
			break;
		case 'boolean':
			assert.boolean(value, 'value');
			break;
		default:
			assert.fail("unknown configuration item type");
	}
	
	// Update database
	DB.setRingMatchConfigItem(this.id, name, value, function () {
		// Set and acknowledge
		item.value = value;
		this.juryPresident.configItemSet(this.matchConfig);
	}.bind(this));
};

/**
 * Create a new match.
 */
Ring.prototype._jpCreateMatch = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	
	// Build the match's config by looping through the key/value pairs of the ring's config
	var config = Object.keys(this.matchConfig).reduce(function (config, key) {
		config[key] = this.matchConfig[key].value;
		return config;
	}.bind(this), {});
	
	// Insert a new match in the database
	DB.insertMatch(this.id, config, function (newDoc) {
		if (newDoc) {
			// Initialise the match
			this._initMatch(newDoc);
			assert.instanceOf(this.match, 'match', Match, 'Match');
			
			// Acknowledge
			// TODO: fix restoration of scoringEnabled state
			this.juryPresident.matchCreated(this.match.config, this.getScoreSlots(), false, this.match.getPenalties());
		}
	}.bind(this));
};

/**
 * End the match.
 */
Ring.prototype._jpEndMatch = function () {
	assert.ok(this.match, "ring must have a match");
	assert.ok(this.juryPresident, "ring must have Jury President");
	
	this.match.end();
};

/**
 * Enable/disable scoring.
 * @param {Boolean} enable - `true` to enable; `false` to disable
 */
Ring.prototype._jpEnableScoring = function (enable) {
	assert.boolean(enable, 'enable');
	assert.array(this.cornerJudges, 'cornerJudges');

	this.scoringEnabled = enable;

	this.juryPresident.scoringStateChanged(enable);
	this.cornerJudges.forEach(function (cj) {
		cj.scoringStateChanged(enable);
	}, this);
};

/**
 * Start the current match state.
 */
Ring.prototype._jpStartMatchState = function () {
	assert.ok(this.match, "ring must have a match");
	
	this.match.startState();
};

/**
 * End the current match state.
 */
Ring.prototype._jpEndMatchState = function () {
	assert.ok(this.match, "ring must have a match");
	
	this.match.endState();
};

/**
 * Start or end an injury.
 */
Ring.prototype._jpStartEndInjury = function () {
	assert.ok(this.match, "ring must have a match");
	
	this.match.startEndInjury();
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
	this.juryPresident.slotsUpdated(this.getSlots(), null);
};


/*
 * ==================================================
 * Match events
 * ==================================================
 */

/**
 * The state of the match has changed.
 */
Ring.prototype._matchStateChanged = function (state) {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.object(state, 'state');
	
	// Notify Jury President and Corner Judges
	this.juryPresident.matchStateChanged(state);
	this.cornerJudges.forEach(function (cj) {
		cj.scoringStateChanged(state.stateStarted && !state.isBreak && !state.injuryStarted);
	}, this);
};

/**
 * The results of a round have been computed.
 */
Ring.prototype._matchResultsComputed = function () {
	this.juryPresident.matchResultsComputed();
};

/**
 * The match has ended.
 */
Ring.prototype._matchEnded = function () {
	// Remove match
	this.match = null;

	// Notify Jury President
	this.juryPresident.matchEnded();
};


exports.Ring = Ring;
