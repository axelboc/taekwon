
/**
 * Match
 */
define(['minpubsub', 'match-config', '../common/competitors', 'enum/match-states'], function (PubSub, config, Competitors, MatchStates) {
	
	// TODO: consider injuries separately from states 
	function Match (judgeIds) {
		this.state = null;
		this.states = [MatchStates.ROUND_1];
		this.stateIndex = -1;
		
		this.stateStarted = false;
		this.injuryStarted = false;
		
		// Store total scores for each judge and round
		this.scores = {};
		judgeIds.forEach(function (id) {
			this.scores[id] = [];
		}, this);
		
		// TODO: penalties

		publish('created', this);
		this._nextState();
	}
	
	Match.prototype = {
		
		_computeTotal: function () {
			Object.keys(this.scores).forEach(function (judgeId) {
				var judgeScores = this.scores[judgeId];
				
				// Total is at least the scores of the current state + penalties
				var total = judgeScores[judgeScores.length - 1]['scores'].slice(0);
				// TODO: add penalties
	
				// If current state is Round 2, then add scores of Round 1 to the total
				if (this.state === MatchStates.ROUND_2) {
					var rd1 = judgeScores[0]['scores'];
					total[0] += rd1[0];
					total[1] += rd1[1];
				}
				
				judgeScores.push({
					state: 'total',
					scores: total
				});
			}, this);
		},
		
		_isTie: function () {
			// TODO: implement Match function _isTie
			return true;
		},
		
		_nextState: function () {
			// If no more states in array, add more if appropriate or end match
			if (this.stateIndex === this.states.length - 1) {
				switch (this.state) {
					case MatchStates.ROUND_1:
						if (config.roundCount === 2) {
							// If match has two rounds, add Break and Round 2 states
							this.states.push(MatchStates.BREAK, MatchStates.ROUND_2);
							break;
						} else {
							// Otherwise, compute total score and end match
							this._computeTotal();
							this._endMatch();
							return;
						}
						
					case MatchStates.ROUND_2:
						this._computeTotal();
						
						if (this._isTie() && config.tieBreaker) {
							// If Round 1 and 2 led to a tie, add Tie Breaker round
							this.states.push(MatchStates.BREAK, MatchStates.TIE_BREAKER);
							break;
						} else {
							// Otherwise, end match
							this._endMatch();
							return;
						}
						
					case MatchStates.TIE_BREAKER:
						this._computeTotal();
						
						if (this._isTie() && config.goldenPoint) {
							// If Tie Breaker led to a tie, add Golden Point round
							this.states.push(MatchStates.BREAK, MatchStates.GOLDEN_POINT);
							break;
						} else {
							// Otherwise, end match
							this._endMatch();
							return;
						}
					
					case MatchStates.GOLDEN_POINT:
						this._endMatch();
						return;
				}
			}
			
			this.stateIndex += 1;
			this.state = this.states[this.stateIndex];

			if (this.state !== MatchStates.BREAK) {
				// Initialise each judge's score array (i.e. [hong, chong]) for the new state
				Object.keys(this.scores).forEach(function (judgeId) {
					this.scores[judgeId].push({
						state: this.state,
						scores: [0, 0]
					});
					publish('judgeScoresUpdated', judgeId, [0, 0]);
				}, this);
			}

			publish('stateChanged', this.state);
		},
		
		_endMatch: function () {
			this.state = null;
			publish('ended');
		},
		
		startState: function () {
			if (this.state === null) {
				publish('error', "Cannot start state: match ended.");
			} else if (this.stateStarted) {
				publish('error', "Cannot start state: already started.");
			} else {
				this.stateStarted = true;
				publish('stateStarted', this.state);
			}
		},
		
		endState: function () {
			if (this.state === null) {
				publish('error', "Cannot end state: match ended.");
			} else if (!this.stateStarted) {
				publish('error', "Cannot end state: not yet started.");
			} else {
				this.stateStarted = false;
				publish('stateEnded', this.state);
				
				// Move to next state
				this._nextState();
			}
		},
		
		startEndInjury: function () {
			this.injuryStarted = !this.injuryStarted;
			if (this.injuryStarted) {
				publish('injuryStarted', this.state);
			} else {
				publish('injuryEnded', this.state);
			}
		},
		
		score: function (judgeId, competitor, points) {
			var judgeScores = this.scores[judgeId];
			var scoresArr = judgeScores[judgeScores.length - 1]['scores'];
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			scoresArr[competitorIndex] += points;
			
			publish('judgeScoresUpdated', judgeId, scoresArr.slice(0));
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
