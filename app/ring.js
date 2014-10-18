
// Modules
var assert = require('assert');
var config = require('./config');
var CornerJudge = require('./corner-judge').CornerJudge;
var JuryPresident = require('./jury-president').JuryPresident;


function Ring(primus, index) {
	this.primus = primus;
	this.index = index;
	this.number = index + 1;
	this.roomId = 'ring' + index;
	this.juryPresident = null;
	this.cornerJudges = [];
	this.scoringEnabled = false;
}

Ring.prototype = {
	
	/**
	 * Broadcast to all users that the state of the ring has changed.
	 * @private
	 */
	_stateChanged: function () {
		this.primus.forEach(function (spark) {
			spark.emit('ringStateChanged', this.getState());
		}.bind(this));
	},
	
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
		assert(!this.juryPresident, "ring is already open");

		this.juryPresident = jp;
		this._stateChanged();
	},
	
	/**
	 * Close the ring.
	 */
	close: function () {
		assert(this.juryPresident, "ring is already closed");

		this.juryPresident = null;
		this._stateChanged();
			
		// Notify Corner Judges that they must leave the ring.
		this.cornerJudges.forEach(function (cj) {
			this.removeCJ(cj, "Ring closed");
		}, this);
	},
	
	/**
	 * Return the ring's Corner Judge with the given ID.
	 * The function throws if the ID is not associated with any Corner Judge.
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
		
		assert(cornerJudge.length > 0, "no Corner Judge with ID=" + id + " in ring #" + this.number);
		assert(cornerJudge.length === 1, cornerJudge.length + " Corner Judges share the same ID=" + id + " in ring #" + this.number);

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
		this.juryPresident.authoriseCJ(cj);
	},
	
	/**
	 * Remove a Corner Judge from the ring.
	 * @param {String|CornerJudge} cj - the ID of the Corner Judge or the CornerJudge object to remove
	 * @param {String} message - the reason for the removal, which will be shown to the Corner Judge
	 */
	removeCJ: function (cj, message) {
		assert(typeof cj === 'string' || cj instanceof CornerJudge, "argument 'cj' must be a string or a valid CornerJudge object");
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
	 * Enable/disable scoring and notify Corner Judges
	 * @param {Boolean} enable - `true` to enable; `false` to disable
	 */
	enableScoring: function (enable) {
		assert(typeof enable === 'boolean', "argument 'enable' must be a boolean");
		
		this.scoringEnabled = enable;
		this.cornerJudges.forEach(function (cj) {
			cj.scoringStateChanged(enable);
		}, this);
	},
	
	/**
	 * A Corner Judge has been authorised by the Jury President.
	 * @param {String} id - the ID of the Corner Judge who has been authorised
	 */
	cjAuthorised: function (id) {
		assert(typeof id === 'string', "argument 'id' must be a string");
		
		this._getCornerJudgeById(id).ringJoined({
			ringIndex: this.index,
			scoringEnabled: this.scoringEnabled,
			jpConnected: this.juryPresident.connected
		});
	},
	
	/**
	 * A Corner Judge scored.
	 * Notify the Jury President.
	 */
	cjScored: function (cornerJudge, score, isUndo) {
		if (this.juryPresident) {
			this.juryPresident.cjScored(cornerJudge, score);
			
			if (!isUndo) {
				cornerJudge.scoreConfirmed(score);
			} else {
				cornerJudge.undoConfirmed(score);
			}
		} else {
			this._debug("Error: ring doesn't have a Jury President.");
		}
	},
	
	/**
	 * A Corner Judge exited the ring.
	 * Remove the judge from the ring and notify the Jury President.
	 */
	cjExited: function (cornerJudge) {
		if (this.juryPresident) {
			this.removeCJ(cornerJudge, "Exited system");
			this.juryPresident.cjExited(cornerJudge);
		} else {
			this._debug("Error: ring doesn't have a Jury President.");
		}
	},
	
	/**
	 * Notify all Corner Judges that the Jury President connection state has changed.
	 * TODO rename to jpConnectionStateChanged
	 */
	jpStateChanged: function (connected) {
		this.cornerJudges.forEach(function (cj) {
			cj.jpStateChanged(connected);
		}, this);
		
		// Disable scoring
		this.enableScoring(false);
	},
	
	/**
	 * Notify the Jury President that the connection state of a Corner Judge has changed
	 */
	cjStateChanged: function (cornerJudge, connected) {
		if (this.juryPresident) {
			this.juryPresident.cjStateChanged(cornerJudge, connected);
		} else {
			this._debug("Error: ring doesn't have a Jury President.");
		}
	},

	_debug: function (msg) {
		console.log("[Ring] " + msg);
	}
	
	
	// TODO: log error when an unauthorised or disconnected judge scores
};

exports.Ring = Ring;
