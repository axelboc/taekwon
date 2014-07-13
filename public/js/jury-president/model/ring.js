
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
	}
	
	Ring.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('ring.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_isFull: function () {
			return (this.judges.length === this.judgeSlotCount);
		},
		
		newJudge: function (id, name, authorised, connected) {
			if (this._isFull()) {
				this._publish('full');
			} else {
				var judge = new Judge(id, name, authorised, connected);
				this.judges.push(judge);
				this.judgeById[judge.id] = judge;
			}
		},
		
		judgeStateChanged: function (id, connected) {
			this.judgeById[id].setConnectionState(connected);
		},
		
		judgeScored: function (id, competitor, score) {
			this.judgeById[id].score(competitor, score);
		},
		
		newMatch: function (config) {
			this.match = new Match(config, this.judges);
		}
		
	};
	
	return Ring;
	
});
