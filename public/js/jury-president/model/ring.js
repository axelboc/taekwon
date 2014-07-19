
define([
	'minpubsub',
	'./judge',
	'./match'

], function (PubSub, Judge, Match) {
	
	function Ring(index) {
		this.index = index;
		
		this.judgeSlots = [];
		this.judgeSlotCount = 0;
		
		this.judgeById = {};
		this.judgeCount = 0;
		
		this.match = null;
	}
	
	Ring.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('ring.' + subTopic, [].slice.call(arguments, 1));
		},
		
		addSlot: function (index) {
			this.judgeSlotCount += 1;
			this.judgeSlots.push({
				index: index,
				judge: null
			});
			this._publish('slotAdded', index);
		},
		
		removeSlot: function (index) {
			if (this.judgeSlotCount === 1) {
				alert("Ring must contain at least one judge slot.");
			} else if (this.judgeSlots[index].judge) {
				alert("To proceed, first disconnect corner judge from last slot.");
			} else {
				this.judgeSlotCount -= 1;
				this.judgeSlots.splice(index, 1);
				this._publish('slotRemoved', index);
			}
		},
		
		_findFreeJudgeSlot: function () {
			for (var i = 0; i < this.judgeSlotCount; i += 1) {
				if (!this.judgeSlots[i].judge) {
					return i;
				}
			}
			// No free slot found
			return -1;
		},
		
		newJudge: function (id, name, authorised, connected) {
			var index = this._findFreeJudgeSlot();
			if (index === -1) {
				this._publish('full', id);
			} else if (this.match && !this.match.hasEnded) {
				this._publish('matchInProgress', id);
			} else {
				var judge = new Judge(id, index, name, authorised, connected);
				this.judgeSlots[index].judge = judge;
				this.judgeCount += 1;
				this.judgeById[judge.id] = judge;
				this._publish('judgeAttached', judge);
			}
		},
		
		judgeDetached: function (id) {
			var judge = this.judgeById[id];
			delete this.judgeById[id];
			this.judgeSlots[judge.index].judge = null;
			this.judgeCount -= 1;
			
			if (this.match) {
				// Erase judge's scoreboard
				this.match.eraseScoreboard(id);
			}
			
			this._publish('judgeDetached', judge);
		},
		
		judgeStateChanged: function (id, connected) {
			this.judgeById[id].setConnectionState(connected);
		},
		
		judgeScored: function (id, competitor, score) {
			this.judgeById[id].score(competitor, score);
		},
		
		newMatch: function (config) {
			var diff = this.judgeSlotCount - this.judgeCount;
			if (diff > 0) {
				alert("Waiting for " + diff + " more corner judge" + (diff > 1 ? "s" : "") + " to join the ring.");
			} else {
				var judges = this.judgeSlots.reduce(function (arr, slot) {
					arr.push(slot.judge);
					return arr;
				}, []);

				var unauthorisedCount = judges.filter(function (judge) {
					return !judge.authorised;
				}).length;
				
				if (unauthorisedCount > 0) {
					alert(unauthorisedCount + " corner judge" + (unauthorisedCount > 1 ? "s are" : " is") + " awaiting your authorisation to join the ring.");
				} else {
					this.match = new Match(config, judges);
				}
			}
		}
		
	};
	
	return Ring;
	
});
