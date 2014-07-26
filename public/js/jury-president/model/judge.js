
define([
	'minpubsub',
	'../../common/competitors'

], function (PubSub, Competitors) {
	
	function Judge(id, index, name, authorised, connected) {
		this.id = id;
		this.index = index;
		this.name = name;
		this.connected = connected;
		this.authorised = authorised;
		
		// TODO: store columns as key/value pairs in scoreboard (not array)
		// TODO: use unique key for total columns
		// TODO: compute total here
		
		this.scoreboard;
		this.resetScoreboard();
		
		this._publish('initialised', this);
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
		
		_addScoreboardColumn: function (columnId) {
			var scores = [0, 0];
			this.scoreboard[columnId] = scores;
			return scores;
		},
		
		score: function (columnId, competitor, points) {
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			var scores = this.scoreboard[columnId];
			// TODO: move this to function (duplicated below)
			if (!scores) {
				scores = this._addScoreboardColumn(columnId);
			}
			
			scores[competitorIndex] += points;
			this._publish('scoresUpdated', scores);
		},
		
		computeTotal: function (columnId, totalColumnId, maluses) {
			var scores = this.scoreboard[columnId];
			
			// If column doesn't exist, add it
			if (!scores) {
				scores = this._addScoreboardColumn(columnId);
			}
			
			// Sum scores and maluses (negative integers)
			var totals = [scores[0] + maluses[0], scores[1] + maluses[1]];
			console.log("totals: ", totals);
			
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
