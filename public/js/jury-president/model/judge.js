
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
		
		/**
		 * Scoreboard
		 * Array of objects representing the main columns of the scoreboard.
		 * Each column has a 'label' (a match state or 'total') and a 'values' array (in order: hong, chong).
		 * Examples of column sequences for various matches:
		 * - 1-round match: 		round-1, total
		 * - 2-round match: 		round-1, round-2, total
		 * - up to golden point: 	round-1, round-2, total, tie-breaker, total, golden point, total
		 */
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
			this.scoreboard = [];
		},
		
		score: function (competitor, points) {
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			var scores = this.scoreboard[state];
			if (!scores) {
				this.scoreboard[state] = scores = [0, 0];
			}
			
			scores[competitorIndex] += points;
			this._publish('scoresUpdated', this.id, scores);
		}
		
	};
	
	return Judge;
	
});
