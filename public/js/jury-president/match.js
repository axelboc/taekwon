
/**
 * Match
 */
define(['minpubsub', 'match-config', 'enum/match-states'], function (PubSub, config, MatchStates) {
	
	// TODO: consider injuries separately from states 
	function Match (judgeIds) {
		this._init();
		
		this.lastState = this.states.length - 1;
		this.state = 0;
		this.stateStarted = false;
		this.injuryStarted = false;
		
		// Store total scores for each judge and round
		this.scores = {};
		
		judgeIds.forEach(function (id) {
			this.scores[id] = {};
		}, this);

		publish('created', this);
		publish('stateChanged', this.states[this.state], false);
	}
	
	Match.prototype = {
		
		_init: function () {
			/* Build match states array */ 
			var states = [MatchStates.ROUND_1];
			
			if (config.roundCount === 2) { states.push(MatchStates.BREAK, MatchStates.ROUND_2); }
			if (config.tieBreaker) { states.push(MatchStates.BREAK, MatchStates.TIE_BREAKER); }
			if (config.goldenPoint) { states.push(MatchStates.BREAK, MatchStates.GOLDEN_POINT); }
			
			this.states = states;
		},
		
		_nextState: function () {
			if (this.state === this.lastState) {
				this._endMatch();
			} else {
				this.state += 1;
				var stateStr = this.states[this.state];
				
				if (stateStr !== MatchStates.BREAK) {
					// Initialise each judge's score array (i.e. [hong, chong]) for the new state
					this.scores.keys().forEach(function (judgeId) {
						this.scores[judgeId][stateStr] = [0, 0];
					}, this);
				}
				
				publish('stateChanged', stateStr);
			}
		},
		
		_endMatch: function () {
			this.state = -1;
			publish('ended');
		},
		
		startState: function () {
			if (this.state === -1) {
				publish('error', "Cannot start state: match ended.");
			} else if (this.stateStarted) {
				publish('error', "Cannot start state: already started.");
			} else {
				this.stateStarted = true;
				publish('stateStarted', this.states[this.state]);
			}
		},
		
		endState: function () {
			if (this.state === -1) {
				publish('error', "Cannot end state: match ended.");
			} else if (!this.stateStarted) {
				publish('error', "Cannot end state: not yet started.");
			} else {
				this.stateStarted = false;
				publish('stateEnded', this.states[this.state]);
				
				// Move to next state
				this._nextState();
			}
		},
		
		startEndInjury: function () {
			this.injuryStarted = !this.injuryStarted;
			if (this.injuryStarted) {
				publish('injuryStarted', this.states[this.state]);
			} else {
				publish('injuryEnded', this.states[this.state]);
			}
		}
		
	};
	
	
	/**
	 * Wrap publish function
	 */
	function publish(subTopic) {
		PubSub.publish('match.' + subTopic, [].slice.call(arguments, 1));
	}
	
	// Debug errors
	PubSub.subscribe('match.error', function (error) {
		console.log(error);
	});
	
	
	return Match;
	
});
