
// Modules
var config = require('./config');


function Ring(primus, index) {
	this.primus = primus;
	this.index = index;
	this.number = index + 1;
	this.roomId = 'ring' + index;
	this.isOpen = false;
	this.juryPresident = null;
	this.cornerJudges = [];
	this.scoringEnabled = false;
}

Ring.prototype = {
	
	/**
	 * Return an object representing the state of the ring (open/close).
	 */
	getState: function () {
		return {
			index: this.index,
			number: this.number,
			open: this.isOpen
		};
	},
	
	_getCornerJudgeById: function (id) {
		var cornerJudge = this.cornerJudges.filter(function (cj) {
			return cj.id === id;
		}, this);
		
		if (cornerJudge.length === 0) {
			this._debug("Error: no Corner Judge with ID=" + id + " in ring #" + this.number + ".");
		} else if (cornerJudge.length > 1) {
			this._debug("Error: " + cornerJudge.length + " Corner Judges share the same ID=" + id + " in ring #" + this.number + ".");
		}
		
		return cornerJudge.length > 0 ? cornerJudge[0] : null;
	},
	
	/**
	 * Broadcast to all users that the state of the ring has changed.
	 */
	_stateChanged: function () {
		this.primus.forEach(function (spark) {
			spark.emit('ringStateChanged', this.getState());
		}.bind(this));
	},
	
	/**
	 * Open the ring.
	 * Return true if the process was successful; false otherwise (ring already open).
	 */
	open: function (juryPresident) {
		if (!this.isOpen) {
			this.isOpen = true;
			this.juryPresident = juryPresident;
			this._stateChanged();
			
			// Success
			return true;
		}
		
		// Ring already open
		this._debug("Error: ring is already open.");
		return false;
	},
	
	/**
	 * Close the ring.
	 */
	close: function () {
		if (this.isOpen) {
			this.isOpen = false;
			this.juryPresident = null;
			this._stateChanged();
			
			// Notify Corner Judges that they must leave the ring.
			this.cornerJudges.forEach(function (cj) {
				cj.ringClosed();
			}, this);
		} else {
			this._debug("Error: ring is already closed.");
		}
	},
	
	/**
	 * Add a Corner Judge to the ring.
	 */
	addCJ: function (cornerJudge) {
		this.cornerJudges.push(cornerJudge);
		if (this.juryPresident) {
			// Request authorisation from Jury PResident
			this.juryPresident.authoriseCJ(cornerJudge);
		} else {
			this._debug("Error: a Corner Judge cannot join a closed ring.");
		}
	},
	
	/**
	 * Remove a Corner Judge from the ring.
	 */
	removeCJ: function (id, message) {
		var cornerJudge = this._getCornerJudgeById(id);
		if (cornerJudge) {
			this.cornerJudges.splice(this.cornerJudges.indexOf(cornerJudge), 1);
			cornerJudge.ringLeft(this.index, message);
		}
	},
	
	/**
	 * A Corner Judge has been authorised by the Jury President.
	 */
	cjAuthorised: function (id) {
		var cornerJudge = this._getCornerJudgeById(id);
		if (cornerJudge) {
			cornerJudge.ringJoined({
				ringIndex: this.index,
				scoringEnabled: this.scoringEnabled,
				jpConnected: this.juryPresident.connected
			});
		}
	},
	
	/**
	 * Broadcast to all Corner Judges that the Jury President connection state has changed.
	 */
	jpStateChanged: function (connected) {
		this.cornerJudges.forEach(function (cj) {
			cj.jpStateChanged(connected);
		}, this);
	},
	
	/**
	 * Notify the Jury President that the connection state of a Corner Judge has changed
	 */
	cjStateChanged: function (cornerJudge, connected) {
		if (this.juryPresident) {
			this.juryPresident.cjStateChanged(cornerJudge, connected);
		} else {
			this._debug("Error: ring is closed.");
		}
	},

	_debug: function (msg) {
		console.log("[Ring] " + msg);
	}
	
	
	// TODO: log error when an unauthorised or disconnected judge scores
};

exports.Ring = Ring;
