
define(['minpubsub'], function (PubSub) {
	
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
		},
		
		addScoreboardColumn: function (columnId) {
			this.scoreboard[columnId] = [0, 0];
		},
		
		score: function (columnId, competitor, points) {
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			var scores = this.scoreboard[columnId];
			scores[competitorIndex] += points;
			this._publish('scoresUpdated', scores);
		}
		
	};
	
	return Judge;
	
});
