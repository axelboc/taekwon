
define([
	'minpubsub',
	'../../common/competitors'

], function (PubSub, Competitors) {
	
	function Judge(id, name, authorised, connected) {
		this.id = id;
		this.name = name;
		this.connected = connected;
		this.authorised = authorised;
		
		this.scoreboard;
		this.resetScoreboard();
	}
	
	Judge.prototype = {
		
		_publish: function (subTopic) {
			// Pass the slot index of the judge with any event
			var args = [].slice.call(arguments, 0);
			args[0] = this.id;
			
			PubSub.publish('judge.' + subTopic, args);
		},
		
		authorise: function () {
			this.authorised = true;
			this._publish('authorised');
		},
		
		setConnectionState: function (connected) {
			this.connected = connected;
			this._publish('connectionStateChanged', connected);
		},
		
		resetScoreboard: function () {
			this.scoreboard = {};
		},
		
		getCurrentScores: function (columnId) {
			var scores = this.scoreboard[columnId];
			
			// If column doesn't exist, create it
			if (!scores) {
				scores = this.scoreboard[columnId] = [0, 0];
			}
			
			return scores;
		},
		
		score: function (columnId, competitor, points) {
			var scores = this.getCurrentScores(columnId);
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			scores[competitorIndex] += points;
			this._publish('scored', scores);
		},
		
		computeTotal: function (columnId, totalColumnId, maluses) {
			// Sum scores and maluses (negative integers)
			var scores = this.getCurrentScores(columnId);
			var totals = [scores[0] + maluses[0], scores[1] + maluses[1]];
			
			// Store totals in scoreboard
			this.scoreboard[totalColumnId] = totals;
		},
		
		getWinner: function (totalColumnId) {
			var totals = this.scoreboard[totalColumnId];
			return totals[0] > totals[1] ? Competitors.HONG : (totals[1] > totals[0] ? Competitors.CHONG : null);
		}
		
	};
	
	return Judge;
	
});
