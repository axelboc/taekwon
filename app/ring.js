
// Modules
var assert = require('assert');
var config = require('./config');
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;


/**
 * Ring.
 * @param {Primus} primus
 * @param {Number} index - the index of the ring, as a positive integer
 */
function Ring(tournament, index) {
	assert(tournament, "argument 'tournament' must be provided");
	assert(typeof index === 'number' && index >= 0 && index % 1 === 0, 
		   "argument 'index' must be a positive integer");
	
	this.tournament = tournament;
	this.index = index;
	this.number = index + 1;
	this.roomId = 'ring' + index;
	this.juryPresident = null;
	this.cornerJudges = [];
	this.scoringEnabled = false;
}

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
		assert(jp instanceof JuryPresident, "argument 'jp' must be a valid JuryPresident object");
		assert(this.tournament, "not part of a tournament");
		assert(!this.juryPresident, "ring is already open");

		this.juryPresident = jp;
		this.tournament.ringStateChanged(this);
		this._debug("Opened");
	},
	
	/**
	 * Close the ring.
	 */
	close: function () {
		assert(this.tournament, "not part of a tournament");
		assert(this.juryPresident, "ring is already closed");

		this.juryPresident = null;
		this.tournament.ringStateChanged(this);
		this._debug("Closed");
			
		// Notify Corner Judges that they must leave the ring.
		this.cornerJudges.forEach(function (cj) {
			this.removeCJ(cj, "Ring closed");
		}, this);
	},
	
	/**
	 * Return the ring's Corner Judge with the given ID.
	 * The function throws if the ID is not associated with exactly one Corner Judge.
	 * @private
	 * @param {String} id
	 * @return {CornerJudge}
	 */
	_getCornerJudgeById: function (id) {
		assert(typeof id === 'string', "argument 'id' must be a string");
		
		// Find the Corner Judge with the given ID
		var cornerJudge = this.cornerJudges.filter(function (cj) {
			return cj.id === id;
		}, this);
		
		assert(cornerJudge.length > 0, 
			   "no Corner Judge with ID=" + id + " in ring #" + this.number);
		assert(cornerJudge.length === 1, cornerJudge.length + 
			   " Corner Judges share the same ID=" + id + " in ring #" + this.number);

		return cornerJudge[0];
	},
	
	/**
	 * Add a Corner Judge to the ring.
	 * @param {CornerJudge} cj
	 */
	addCJ: function (cj) {
		assert(cj instanceof CornerJudge, "argument 'cj' must be a valid CornerJudge object");
		assert(this.juryPresident, "ring must have Jury President");
		
		// Add Corner Judge to array
		this.cornerJudges.push(cj);
		
		// Request authorisation from Jury President
		this.juryPresident.cjAdded(cj);
	},
	
	/**
	 * Remove a Corner Judge from the ring.
	 * @param {String|CornerJudge} cj - the ID of the Corner Judge or the CornerJudge object to remove
	 * @param {String} message - the reason for the removal, which will be shown to the Corner Judge
	 */
	removeCJ: function (cj, message) {
		assert(typeof cj === 'string' || cj instanceof CornerJudge, 
			   "argument 'cj' must be a string or a valid CornerJudge object");
		assert(typeof message === 'string', "argument 'message' must be a string");
		
		// If an ID is passed, get the corresponding Corner Judge
		if (typeof cj === 'string') {
			cj = this._getCornerJudgeById(cj);
		}
		
		// Make sure the Corner Judge actually is in the ring
		var index = this.cornerJudges.indexOf(cj);
		assert(index > -1, "Corner Judge is not in the ring");
		
		// Remove the Corner Judge from the ring
		this.cornerJudges.splice(index, 1);
		
		// Ackonwledge removal
		cj.ringLeft(this.index, message);
	},
	
	/**
	 * Enable/disable scoring.
	 * @param {Boolean} enable - `true` to enable; `false` to disable
	 */
	enableScoring: function (enable) {
		assert(typeof enable === 'boolean', "argument 'enable' must be a boolean");
		
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
		assert(typeof id === 'string', "argument 'id' must be a string");
		
		this._getCornerJudgeById(id).ringJoined();
	},
	
	/**
	 * A Corner Judge's request to join the ring has been rejected by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been authorised
	 * @param {String} message - the reason for the rejection
	 */
	cjRejected: function (id, message) {
		assert(typeof id === 'string', "argument 'id' must be a string");
		assert(typeof message === 'string', "argument 'message' must be a string");
		
		// Remove Corner Judge from ring
		this.removeCJ(id, message);
	},
	
	/**
	 * A Corner Judge has been removed from the ring by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been removed
	 */
	cjRemoved: function (id) {
		assert(typeof id === 'string', "argument 'id' must be a string");
		
		// Remove Corner Judge from ring
		this.removeCJ(id, "Removed from ring");
	},
	
	/**
	 * A Corner Judge has scored or undone a previous score.
	 * @param {CornerJudge} cj
	 * @param {Object} score
	 */
	cjScored: function (cj, score) {
		assert(cj instanceof CornerJudge, "argument 'cj' must be a valid CornerJudge object");
		assert(this.juryPresident, "ring must have Jury President");
		
		// Notify Jury President
		this.juryPresident.cjScored(cj, score);
	},
	
	/**
	 * A Corner Judge has exited the system.
	 * @param {CornerJudge} cj
	 */
	cjExited: function (cj) {
		assert(cj instanceof CornerJudge, "argument 'cj' must be a valid CornerJudge object");
		assert(this.juryPresident, "ring must have Jury President");
		
		// Remove Corner Judge from ring
		this.removeCJ(cj, "Exited system");
		
		// Notify Jury President
		this.juryPresident.cjExited(cj);
	},
	
	/**
	 * The connection state of the Jury President has changed.
	 * @param {Boolean} connected - `true` for connected; `false` for disconnected
	 */
	jpConnectionStateChanged: function (connected) {
		assert(typeof connected === 'boolean', "argument 'connected' must be a boolean");
		
		// Notify the Corner Judges
		this.cornerJudges.forEach(function (cj) {
			cj.jpConnectionStateChanged(connected);
		}, this);
	},
	
	/**
	 * The connection state of a Corner Judge has changed.
	 * @param {CornerJudge} cj
	 * @param {Boolean} connected - `true` for connected; `false` for disconnected
	 */
	cjConnectionStateChanged: function (cj, connected) {
		assert(cj instanceof CornerJudge, "argument 'cj' must be a valid CornerJudge object");
		assert(typeof connected === 'boolean', "argument 'connected' must be a boolean");
		assert(this.juryPresident, "ring must have Jury President");
		
		// Notify the Jury President
		this.juryPresident.cjConnectionStateChanged(cj, connected);
	},

	_debug: function (msg) {
		console.log("[Ring] " + msg);
	}
	
};

exports.Ring = Ring;
