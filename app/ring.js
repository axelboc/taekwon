
// Modules
var config = require('./config');


function Ring(primus, index) {
	this.primus = primus;
	this.index = index;
	this.number = index + 1;
	this.roomId = 'ring' + index;
	this.allocated = false;
	this.juryPresident = null
}

Ring.prototype = {
	
	getAllocation: function () {
		return {
			index: this.index,
			number: this.number,
			allocated: this.allocated
		};
	},
	
	_allocationChanged: function () {
		// Notify all users that the allocation state of the ring has changed
		this.primus.forEach(function (spark) {
			spark.emit('ringAllocationChanged', this.getAllocation());
		}.bind(this));
	},
	
	/**
	 * Allocate a Jury President to the ring.
	 * Return true if the allocation was successful; false otherwise (ring already allocated).
	 */
	allocate: function (juryPresident) {
		if (!this.allocated) {
			this.allocated = true;
			this.juryPresident = juryPresident;
			this._allocationChanged();
			
			// Success
			return true;
		}
		
		// Ring already allocated
		return false;
	},
	
	/**
	 * Deallocate the ring's Jury President and remove all Corner Judges.
	 */
	deallocate: function () {
		if (this.allocated) {
			this.allocated = false;
			this.juryPresident = null;
			this._allocationChanged();
			
			// TODO: remove corner judges
		}
	}
	
};

exports.Ring = Ring;
