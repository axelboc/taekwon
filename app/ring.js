
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
	 * Let a Corner Judge join the ring.
	 */
	join: function (cornerJudge) {
		this.cornerJudges.push(cornerJudge);
		if (this.juryPresident) {
			this.juryPresident.authoriseCornerJudge(cornerJudge.name);
		} else {
			this._debug("Error: a Corner Judge cannot join a closed ring.");
		}
	},
	
	/**
	 * Let a Corner Judge leave the ring.
	 */
	leave: function (cornerJudge) {
		
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
	
};

exports.Ring = Ring;
