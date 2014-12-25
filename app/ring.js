
// Modules
var assert = require('./lib/assert');
var logger = require('./lib/log')('ring');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;


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

Ring.prototype = {
	
	/**
	 * Return an object representing the state of the ring (open/close).
	 * @return {Array}
	 */
	getState: function () {
		return {
			index: this.index,
			number: this.number,
			open: this.juryPresident !== null
		};
	},
	
	/**
	 * Open the ring by assigning it a Jury President.
	 * @param {JuryPresident} jp
	 */
	open: function (jp) {
		assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
		assert.ok(!this.juryPresident, "ring is already open");

		this.juryPresident = jp;
		this.juryPresident.ringOpened(this);
		this.emit('opened');
		
		// Listen for events
		var func = this._jpConnectionStateChanged.bind(this, jp);
		jp.on('connected', func);
		jp.on('disconnected', func);
		
		// Update the database
		DB.setRingJpId(this.id, this.juryPresident.id);
		
		logger.info('opened', {
			number: this.number,
			jpId: jp.id
		});
	},
	
	/**
	 * Close the ring.
	 */
	close: function () {
		assert.ok(this.juryPresident, "ring is already closed");
		
		// Remove listeners
		jp.removeAllListeners('connected');
		jp.removeAllListeners('disconnected');

		this.juryPresident = null;
		this.emit('closed');
		
		// Update the database
		DB.setRingJpId(this.id, null);
			
		// Ask Corner Judges to leave the ring
		this.cornerJudges.forEach(function (cj) {
			this.removeCJ(cj, "Ring closed");
		}, this);
		
		logger.info('closed', {
			number: this.number
		});
	},
	
	/**
	 * Return the ring's Corner Judge with the given ID.
	 * The function throws if the ID is not associated with exactly one Corner Judge.
	 * @private
	 * @param {String} id
	 * @return {CornerJudge}
	 */
	_getCornerJudgeById: function (id) {
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
	},
	
	/**
	 * Add a Corner Judge to the ring.
	 * @param {CornerJudge} cj
	 */
	addCJ: function (cj) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		assert.ok(this.juryPresident, "ring must have Jury President");
		
		// Add Corner Judge to array
		this.cornerJudges.push(cj);
		
		// Listen for events
		var func = this._cjConnectionStateChanged.bind(this, cj);
		cj.on('connected', func);
		cj.on('disconnected', func);
		
		// Request authorisation from Jury President
		this.juryPresident.cjAdded(cj);
		cj.waitingForAuthorisation(this);
		
		logger.info('cjAdded', {
			number: this.number,
			cjId: cj.id,
			cjName: cj.name
		});
	},
	
	/**
	 * Remove a Corner Judge from the ring.
	 * @param {String|CornerJudge} cj - the ID of the Corner Judge or the CornerJudge object to remove
	 * @param {String} message - the reason for the removal, which will be shown to the Corner Judge
	 */
	removeCJ: function (cj, message) {
		assert.ok(typeof cj === 'string' || cj instanceof CornerJudge, 
			   "`cj` must be a string or a valid CornerJudge object");
		assert.string(message, 'message');
		
		// If an ID is passed, get the corresponding Corner Judge
		if (typeof cj === 'string') {
			cj = this._getCornerJudgeById(cj);
		}
		
		// Make sure the Corner Judge actually is in the ring
		var index = this.cornerJudges.indexOf(cj);
		assert.ok(index > -1, "Corner Judge is not in the ring");
		
		// Remove the Corner Judge from the ring
		this.cornerJudges.splice(index, 1);
		
		// Remove listeners
		cj.removeAllListeners('connected');
		cj.removeAllListeners('disconnected');
		
		// Ackonwledge removal
		cj.ringLeft(message);
		
		logger.info('cjRemoved', {
			number: this.number,
			cjId: cj.id,
			cjName: cj.name,
			message: message
		});
	},
	
	/**
	 * Enable/disable scoring.
	 * @param {Boolean} enable - `true` to enable; `false` to disable
	 */
	enableScoring: function (enable) {
		assert.boolean(enable, 'enable');
		
		this.scoringEnabled = enable;
		
		// Notify Corner Judges
		this.cornerJudges.forEach(function (cj) {
			cj.scoringStateChanged(enable);
		}, this);
	},
	
	/**
	 * A Corner Judge's request to join the ring has been authorised by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been authorised
	 */
	cjAuthorised: function (id) {
		assert.string(id, 'id');
		
		var cj = this._getCornerJudgeById(id);
		cj.ringJoined();
	},
	
	/**
	 * A Corner Judge's request to join the ring has been rejected by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been authorised
	 * @param {String} message - the reason for the rejection
	 */
	cjRejected: function (id, message) {
		assert.string(id, 'id');
		assert.string(message, 'message');
		
		// Remove Corner Judge from ring
		this.removeCJ(id, message);
	},
	
	/**
	 * A Corner Judge has been removed from the ring by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been removed
	 */
	cjRemoved: function (id) {
		assert.string(id, 'id');
		
		// Remove Corner Judge from ring
		this.removeCJ(id, "Removed from ring");
	},
	
	/**
	 * A Corner Judge has scored or undone a previous score.
	 * @param {CornerJudge} cj
	 * @param {Object} score
	 */
	cjScored: function (cj, score) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		assert.ok(this.juryPresident, "ring must have Jury President");
		
		// Notify Jury President
		this.juryPresident.cjScored(cj, score);
	},
	
	/**
	 * A Corner Judge has exited the system.
	 * @param {CornerJudge} cj
	 */
	cjExited: function (cj) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		assert.ok(this.juryPresident, "ring must have Jury President");
		
		// Remove Corner Judge from ring
		this.removeCJ(cj, "Exited system");
		
		// Notify Jury President
		this.juryPresident.cjExited(cj);
	},
	
	/**
	 * The connection state of the Jury President has changed.
	 * @param {JuryPresident} jp
	 */
	_jpConnectionStateChanged: function (jp) {
		assert.instanceOf(jp, 'jp', JuryPresident, 'JuryPresident');
		assert.array(this.cornerJudges, 'cornerJudges');
		
		// Notify the Corner Judges
		this.cornerJudges.forEach(function (cj) {
			cj.jpConnectionStateChanged(jp.connected);
		}, this);
	},
	
	/**
	 * The connection state of a Corner Judge has changed.
	 * @param {CornerJudge} cj
	 */
	_cjConnectionStateChanged: function (cj) {
		assert.instanceOf(cj, 'cj', CornerJudge, 'CornerJudge');
		assert.ok(this.juryPresident, "ring must have Jury President");
		
		// Notify the Jury President
		this.juryPresident.cjConnectionStateChanged(cj, cj.connected);
	}
	
};

exports.Ring = Ring;
