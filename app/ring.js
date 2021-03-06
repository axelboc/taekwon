'use strict';

// Modules
var config = require('../config/config.json');
var assert = require('./lib/assert');
var log = require('./lib/log');
var util = require('./lib/util');
var DB = require('./lib/db');
var asyncEach = require('async/each');
var EventEmitter = require('events').EventEmitter;
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;
var Match = require('./match').Match;
var MatchStates = require('./enum/match-states');

var JP_HANDLER_PREFIX = '_jp';
var JP_EVENTS = [
	'addSlot', 'removeSlot', 'authoriseCJ',
	'setConfigItem', 'createMatch', 'continueMatch', 'endMatch',
	'startMatchState', 'endMatchState', 'incrementPenalty', 'decrementPenalty',
	'toggleInjury', 'saveTimerValue', 'connectionStateChanged'
];

var CJ_HANDLER_PREFIX = '_cj';
var CJ_EVENTS = ['cancelJoin', 'score', 'undo', 'connectionStateChanged'];

var MATCH_HANDLER_PREFIX = '_match';
var MATCH_EVENTS = ['stateChanged', 'scoreboardsUpdated', 'penaltiesUpdated'];


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
	
	// Initialise logger
	this.logger = log.createLogger('ring', 'Ring:' + this.number, {
		id: id,
		index: index
	});
}

// Inherit EventEmitter
util.inherits(Ring, EventEmitter);

/**
 * Return the state of each Corner Judge in an array.
 * @return {Array}
 */
Ring.prototype.getCJStates = function () {
	return this.cornerJudges.map(function (cj) {
		return {
			id: cj.id,
			name: cj.name,
			authorised: cj.authorised,
			connected: cj.connected
		};
	});
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
		
		this.logger.info('opened', { jpId: jp.id });
	}.bind(this));
};

/**
 * Close the ring.
 */
Ring.prototype.close = function () {
	assert.ok(this.juryPresident, "ring is already closed");
	
	// Update the database
	DB.setRingJPId(this.id, null, function () {
		// Ask Corner Judges to leave the ring
		asyncEach(this.cornerJudges, function (cj, cb) {
			this.removeCJ(cj, "Ring closed", cb);
		}.bind(this), function () {
			// If a match is in progress, end it
			if (this.match && !this.match.state.is(MatchStates.MATCH_ENDED)) {
				this.match.state.end();
			}
			
			// Close the ring
			util.removeEventListeners(this.juryPresident, JP_EVENTS);
			this.juryPresident = null;
			
			this.emit('stateChanged');
			this.logger.info('closed');
		}.bind(this));
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
		this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
		
		// Acknowledge
		cj.waitingForAuthorisation();
		
		this.logger.info('cjAdded', {
			cjId: cj.id,
			cjName: cj.name
		});
	}.bind(this));
};

/**
 * Remove a Corner Judge from the ring.
 * @param {String|CornerJudge} cj - the ID of the Corner Judge or the CornerJudge object to remove
 * @param {String} message - the reason for the removal, which will be shown to the Corner Judge
 * @param {Function} cb - optional callback
 */
Ring.prototype.removeCJ = function (cj, message, cb) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.string(message, 'message', true);
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
			this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
			if (!cj.authorised) {
				cj.rejected(message);
			} else {
				cj.ringLeft(message);
			}

			this.logger.info('cjRemoved', {
				cjId: cj.id,
				cjName: cj.name,
				message: message
			});
			
			if (cb) { cb(); }
		}.bind(this));
	}.bind(this));
};

/**
 * Test whether a Corner Judge has (or is trying to) join the ring.
 * @param {CornerJudge} cj
 * @return {Boolean}
 */
Ring.prototype.hasCJ = function (cj) {
	return this.cornerJudges.indexOf(cj) !== -1;
};

/**
 * Instanciate and initialise a new match object based on a database document.
 * @param {Object} doc
 */
Ring.prototype._initMatch = function (doc) {
	assert.object(doc, 'doc');
	
	this.match = new Match(doc._id, doc.config, doc.data);
	util.addEventListeners(this, this.match, MATCH_EVENTS, MATCH_HANDLER_PREFIX);
	
	// Start the state machine
	this.match.state.init();
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
			this.logger.info('matchRestored', { match: doc });
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
		this.logger.info('slotAdded', { slotCount: this.slotCount });
		
		this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
	}.bind(this));
};

/**
 * Remove a Corner Judge slot.
 */
Ring.prototype._jpRemoveSlot = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.integerGt0(this.slotCount, 'slotCount');
	assert.ok(this.cornerJudges.length <= this.slotCount, "number of Corner Judges exceeds slot count");
	
	var reason;
	if (this.slotCount === 1) {
		reason = "The ring must have at least one Corner Judge.";
	} else if (this.cornerJudges.length === this.slotCount) {
		reason = "Please remove a Corner Judge before proceeding.";
	}
	
	if (reason) {
		this.logger.warn('slotNotRemoved', reason, {
			slotCount: this.slotCount,
			cjCount: this.cornerJudges.length
		});
		
		this.juryPresident.slotNotRemoved(reason);
		return;
	}
	
	// Update the database
	DB.setRingSlotCount(this.id, this.slotCount - 1, function () {
		this.slotCount -= 1;
		this.logger.info('slotRemoved', { slotCount: this.slotCount });

		this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
	}.bind(this));
};

/**
 * A Corner Judge's request to join the ring has been authorised by the Jury President.
 * @param {Object} data
 * 		  {String} data.id - the ID of the Corner Judge to authorise
 */
Ring.prototype._jpAuthoriseCJ = function (data) {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.object(data, 'data');
	assert.string(data.id, 'data.id');
	
	// Retrieve Corner Judge with ID
	var cj = this._getCornerJudgeById(data.id);
	
	// Update the database
	DB.setCJAuthorised(data.id, true, function () {
		this.logger.info('cjAuthorised', {
			cjId: cj.id,
			cjName: cj.name
		});
		
		// Acknowledge
		cj.ringJoined(this);
		this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
		
		// If a match is in progress, initialise a scoreboard for the newly authorised judge
		if (this.match) {
			this.match.initScoreboard(cj);
		}
	}.bind(this));
};

/**
 * Set the value of a configuration item.
 * @param {Object} data
 * 		  {String} data.name - the name of the configuration item
 * 		  {Any} data.value - the new value
 */
Ring.prototype._jpSetConfigItem = function (data) {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.object(data, 'data');
	
	var name = data.name;
	var value = data.value;
	assert.string(name, 'data.name');
	
	var item = this.matchConfig[name];
	assert.object(item, "configuration item not found");
	
	// Assert `value` according to the type of the configuration item
	switch (item.type) {
		case 'time':
			// Value indicates whether to increment (1) or decrement (-1) the time
			assert.ok(value === 1 || value === -1, "`value` must be 1 to increment or -1 to decrement");
			
			// Check that the new value is greater than zero
			var newVal = item.value + value * config.matchConfig.timeStep;
			assert.ok(newVal > 0, "value of time configuration item must remain greater than 0");
			
			value = newVal;
			break;
		case 'boolean':
			// Value provided is the new value to set
			assert.boolean(value, 'value');
			break;
		default:
			assert.ok(false, "unknown configuration item type");
	}
	
	// Update database
	DB.setRingMatchConfigItem(this.id, name, value, function () {
		// Set new value
		item.value = value;
		this.logger.info('configItemSet', {
			itemType: item.type,
			itemName: name,
			itemValue: value
		});
		
		// Acknowledge
		this.juryPresident.matchConfigUpdated(this.matchConfig);
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
			
			// Initialise a new scoreboard for each Corner Judge
			this.cornerJudges.forEach(this.match.initScoreboard.bind(this.match));
			this.logger.info('matchCreated', { match: newDoc });
		}
	}.bind(this));
};

/**
 * Continue the match.
 */
Ring.prototype._jpContinueMatch = function () {
	assert.ok(this.match, "ring must have a match");
	this.match.state.break();
};

/**
 * End the match.
 */
Ring.prototype._jpEndMatch = function () {
	assert.ok(this.match, "ring must have a match");
	this.match.state.end();
};

/**
 * Start the current match state.
 */
Ring.prototype._jpStartMatchState = function () {
	assert.ok(this.match, "ring must have a match");
	this.match.state.startState();
};

/**
 * End the current match state.
 */
Ring.prototype._jpEndMatchState = function () {
	assert.ok(this.match, "ring must have a match");
	this.match.state.endState();
};

/**
 * Increment a competitor's penalty type.
 */
Ring.prototype._jpIncrementPenalty = function (data) {
	assert.ok(this.match, "ring must have a match");
	this.match.incrementPenalty(data.type, data.competitor);
};

/**
 * Decrement a competitor's penalty type.
 */
Ring.prototype._jpDecrementPenalty = function (data) {
	assert.ok(this.match, "ring must have a match");
	this.match.decrementPenalty(data.type, data.competitor);
};

/**
 * Start or end an injury.
 */
Ring.prototype._jpToggleInjury = function () {
	assert.ok(this.match, "ring must have a match");
	this.match.state.toggleInjury();
};

/**
 * Save the value of a timer.
 */
Ring.prototype._jpSaveTimerValue = function (data) {
	assert.ok(this.match, "ring must have a match");
	this.match.saveTimerValue(data.name, data.value);
};

/**
 * The connection state of the Jury President has changed.
 */
Ring.prototype._jpConnectionStateChanged = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.array(this.cornerJudges, 'cornerJudges');
	
	// Notify Corner Judges
	this.cornerJudges.forEach(function (cj) {
		cj.jpConnectionStateChanged(this);
	}, this);
};


/*
 * ==================================================
 * Corner Judge events
 * ==================================================
 */

/**
 * A Corner Judge has cancelled its own request to join the ring.
 * @param {CornerJudge} cj
 */
Ring.prototype._cjCancelJoin = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	this.removeCJ(cj, "");
};

/**
 * A Corner Judge has scored.
 * @param {CornerJudge} cj
 * @param {Object} score
 */
Ring.prototype._cjScore = function (cj, score) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.object(score, 'score');
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.ok(this.match, "ring must have a match");

	// Try to score
	if (this.match.score(cj.id, score)) {
		cj.scored(score);
	}
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

	// Negate score
	score.points *= -1;

	// Try to undo
	if (this.match.score(cj.id, score)) {
		cj.undid(score);
	}
};

/**
 * The connection state of a Corner Judge has changed.
 * @param {CornerJudge} cj
 */
Ring.prototype._cjConnectionStateChanged = function (cj) {
	assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
	assert.ok(this.juryPresident, "ring must have Jury President");

	// Notify Jury President
	this.juryPresident.slotsUpdated(this.slotCount, this.getCJStates());
};


/*
 * ==================================================
 * Match events
 * ==================================================
 */

/**
 * The state of the match has changed.
 * @param {String} state
 * @param {String} round
 */
Ring.prototype._matchStateChanged = function (transition, fromState, toState) {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.array(this.cornerJudges, 'cornerJudges');
	assert.ok(this.match, "ring must have a match");
	assert.string(transition, 'transition');
	assert.string(fromState, 'fromState');
	assert.string(toState, 'toState');
	
	// Notify Jury President and Corner Judges
	this.juryPresident.matchStateChanged(this, this.match, transition, fromState, toState);
	this.cornerJudges.forEach(function (cj) {
		cj.matchStateChanged(this, this.match, transition, fromState, toState);
	}, this);
};

/**
 * The match's scores have been updated.
 */
Ring.prototype._matchScoreboardsUpdated = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.ok(this.match, "ring must have a match");
	
	// Notify Jury President
	this.juryPresident.matchScoreboardsUpdated(this.match.getCurrentScoreboards());
};

/**
 * The match's penalties have been updated.
 * @param {Object} penalties
 */
Ring.prototype._matchPenaltiesUpdated = function () {
	assert.ok(this.juryPresident, "ring must have Jury President");
	assert.ok(this.match, "ring must have a match");
	
	// Notify Jury President
	this.juryPresident.penaltiesUpdated(this.match.getCurrentPenalties());
};

module.exports.Ring = Ring;
