
define([
	'minpubsub',
	'./judge',
	'./match'

], function (PubSub, Judge, Match) {
	
	function Ring(index, slotCount) {
		this.index = index;
		this.slotCount = slotCount;
		
		this.cornerJudges = [];
		this.match = null;
	}
	
	Ring.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ring.' + subTopic, [].slice.call(arguments, 1));
		},
		
		getCornerJudgeById: function (id) {
			// Find the Corner Judge with the given ID
			var cornerJudge = this.cornerJudges.filter(function (cj) {
				return cj.id === id;
			}, this);
			
			if (cornerJudge.length !== 1) {
				console.error("Error while getting Corner Judge by ID (ID=" + id + ", found=" + cornerJudge.length + ")");
			}
			
			return cornerJudge[0];
		},
		
		addSlot: function () {
			this.slotCount += 1;
			this._publish('slotsUpdated');
		},
		
		removeSlot: function () {
			/*if (this.slotCount === 1) {
				alert("Ring must contain at least one judge slot.");
			} else if (this.slots[index].judge) {
				alert("To proceed, first disconnect corner judge from last slot.");
			} else {*/
			this.slotCount -= 1;
			this._publish('slotsUpdated');
		},
		
		addCJ: function (id, name, authorised, connected) {
			if (this.cornerJudges.length > this.slotCount) {
				console.error("Ring is full");
			}
			
			var cj = new Judge(id, name, authorised, connected);
			this.cornerJudges.push(cj);
			this._publish('cjAdded', cj);
		},
		
		removeCJ: function (id) {
			var cj = this.getCornerJudgeById(id);
			this.cornerJudges.splice(this.cornerJudges.indexOf(cj), 1);
			this._publish('cjRemoved', cj);
		},
		
		authoriseCJ: function (id) {
			this.getCornerJudgeById(id).authorise();
		},
		
		score: function (id, score) {
			this.getCornerJudgeById(id).score(this.match.scoreboardColumnId, score);
		},
		
		undo: function (id, score) {
			this.getCornerJudgeById(id).undo(this.match.scoreboardColumnId, score);
		},
		
		judgeStateChanged: function (id, connected) {
			this.getCornerJudgeById(id).setConnectionState(connected);
		},
		
		resetScoreboards: function () {
			// Ask judges to reset their scoreboard
			this.cornerJudges.forEach(function (cj) {
				cj.resetScoreboard();
			});
		}
		
	};
	
	return Ring;
	
});
