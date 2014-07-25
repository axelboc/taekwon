
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
			this._publish('scoreboardReset');
		},
		
		_initScoreboardColumn: function (columnId) {
			var scores = [0, 0];
			this.scoreboard[columnId] = scores;
			return scores;
		},
		
		score: function (columnId, competitor, points) {
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			var scores = this.scoreboard[columnId];
			if (!scores) {
				scores = this._initScoreboardColumn(columnId);
			}
			
			scores[competitorIndex] += points;
			this._publish('scoresUpdated', scores);
		},
		
		computeTotal: function (totalColumnId, statesCovered, maluses) {
			var totals = [0, 0];
			
			// Sum scores
			statesCovered.forEach(function (state) {
				var scores = this.scoreboard[state];
				if (scores) {
					totals[0] += scores[0];
					totals[1] += scores[1];
				} else {
					this._initScoreboardColumn(state);
				}
			}, this);
			
			// Add maluses (negative integers)
			totals[0] += maluses[0];
			totals[1] += maluses[1];
			
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
