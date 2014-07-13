
define([
	'minpubsub',
	'./judge',
	'./match'

], function (PubSub, Judge, Match) {
	
	function Ring(index, judgeSlotCount) {
		this.index = index;
		this.judgeSlotCount = judgeSlotCount;
		
		this.judges = [];
		this.judgeById = {};
		this.match = null;

		// Prepare context for JudgeSidebar and MatchPanel templates
		var indices = [];
		for (var i = 0; i < this.judgeSlotCount; i += 1) {
			indices.push(i + 1);
		}
		
		this.tmplContext = {
			indices: indices
		};
	}
	
	Ring.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('ring.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_findFreeJudgeSlot: function () {
			for (var i = 0; i < this.judgeSlotCount; i += 1) {
				if (!this.judges[i]) {
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
			} else {
				var judge = new Judge(id, index, name, authorised, connected);
				this.judges[index] = judge;
				this.judgeById[judge.id] = judge;
				this._publish('judgeAttached', judge);
			}
		},
		
		judgeDetached: function (id) {
			var judge = this.judgeById[id];
			delete this.judgeById[id];
			this.judges[judge.index] = null;
			this._publish('judgeDetached', judge);
		},
		
		judgeStateChanged: function (id, connected) {
			this.judgeById[id].setConnectionState(connected);
		},
		
		judgeScored: function (id, competitor, score) {
			this.judgeById[id].score(competitor, score);
		},
		
		newMatch: function (config) {
			this.match = new Match(config, this.judges);
		},
		
		clearMatch: function () {
			this.match = null;
		}
		
	};
	
	return Ring;
	
});
