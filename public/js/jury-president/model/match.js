
define([
	'minpubsub',
	'../../common/competitors',
	'./match-states'

], function (PubSub, Competitors, MatchStates) {
	
	function Match(config, judges) {
		this.config = config;
		this.judges = judges;
		
		this.state = null;
		this.states = [MatchStates.ROUND_1];
		this.stateIndex = -1;
		
		this.stateStarted = false;
		this.injuryStarted = false;
		this.scoringEnabled = false;
		
		// TODO: consider moving scoreboards to Judge module
		// TODO: fix issue with judges entering/leaving ring during match (this.ring.judges?)
		
		/**
		 * Judge scoreboards
		 * Each scoreboard is an array of objects representing the main columns of the scoreboard.
		 * Each column object contains two keys: 'label' (string) and 'values' (array of two integers, for hong and chong).
		 * Examples of column sequences for various matches:
		 * - 1-round match: 		round-1, maluses, total
		 * - 2-round match: 		round-1, round-2, maluses, total
		 * - up to golden point: 	round-1, round-2, maluses, total, tie-breaker, maluses, total, golden point
		 */
		this.scoreboards = {};
		this.judges.forEach(function (judge) {
			this.scoreboards[judge.id] = [];
		}, this);
		
		// Penalties ('warnings' and 'fouls') given at each state (except break states)
		this.penalties = {};

		this._publish('created', this);
		this._nextState();
	}
	
	Match.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('match.' + subTopic, [].slice.call(arguments, 1));
		},
		
		/**
		 * Compute maluses from penalties, knowing that:
		 * - 3 warnings = -1 pt
		 * - 1 foul 	= -1 pt
		 */
		_getMaluses: function (penalties) {
			var maluses = [];
			for (var i = 0; i <= 1; i += 1) {
				maluses.push(- Math.floor(penalties.warnings[i] / 3) - penalties.fouls[i]);
			}
			return maluses;
		},
		
		/**
		 * Compute total maluses and scores for each judge and add them to their scoreboard
		 */
		_computeTotal: function () {
			Object.keys(this.scoreboards).forEach(function (judgeId) {
				var scoreboard = this.scoreboards[judgeId];
				
				// Get the last colum of the scoreboard and its corresponding penalties
				var lastCol = scoreboard[scoreboard.length - 1];
				
				// Start computing total scores and maluses
				var totalScores = lastCol.values.slice(0);
				var totalMaluses = this._getMaluses(this.penalties[lastCol.label]);
	
				// If current state is round 2, then add scores and penalties from round 1 (the first column in the scoreboard)
				if (this.state === MatchStates.ROUND_2) {
					var firstCol = scoreboard[0];
					var scores = firstCol.values;
					var maluses = this._getMaluses(this.penalties[firstCol.label]);
					for (var i = 0; i <= 1; i += 1) {
						totalScores[i] += scores[i];
						totalMaluses[i] += maluses[i];
					}
				}
				
				// Apply maluses to total
				for (i = 0; i <= 1; i += 1) {
					totalScores[i] -= totalMaluses[i];
				}
				
				// Add total maluses and scores to scoreboard
				scoreboard.push({
					label: 'maluses',
					values: totalMaluses
				}, {
					label: 'total',
					values: totalScores
				});
			}, this);
		},
		
		computeWinner: function () {
			var diff = 0;
			
			// Loop through the judges' scoreboards
			Object.keys(this.scoreboards).forEach(function (judgeId) {
				var scoreboard = this.scoreboards[judgeId];
				
				// Look at the last column of the scoreboard (total or golden point)
				var totals = scoreboard[scoreboard.length - 1].values;
				
				// +1 if hong wins, -1 if chong wins, 0 if tie
				diff += (totals[0] > totals[1] ? 1 : (totals[0] < totals[1] ? -1 : 0));
			}, this);
			
			return diff > 0 ? Competitors.HONG : (diff < 0 ? Competitors.CHONG : null);
		},
		
		_isTie: function () {
			// If tie, computeWinner returns null
			return !this.computeWinner();
		},
		
		_nextState: function () {
			// If no more states in array, add more if appropriate or end match
			if (this.stateIndex === this.states.length - 1) {
				switch (this.state) {
					case MatchStates.ROUND_1:
						if (this.config.roundCount === 2) {
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
						
						if (this._isTie() && this.config.tieBreaker) {
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
						
						if (this._isTie() && this.config.goldenPoint) {
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
				// Add a new column to each judge's scoreboard for the new state
				Object.keys(this.scoreboards).forEach(function (judgeId) {
					this.penalties[this.state] = {
						warnings: [0, 0],
						fouls: [0, 0]
					};
					
					this.scoreboards[judgeId].push({
						label: this.state,
						values: [0, 0]
					});
					
					this._publish('judgeScoresUpdated', judgeId, [0, 0]);
				}, this);
			}

			this._publish('stateChanged', this.state);
		},
		
		_endMatch: function () {
			this.state = null;
			this._publish('ended');
		},
		
		hasEnded: function () {
			return this.state === null;
		},
		
		startState: function () {
			if (this.state === null) {
				this._publish('error', "Cannot start state: match ended.");
			} else if (this.stateStarted) {
				this._publish('error', "Cannot start state: already started.");
			} else {
				this.stateStarted = true;
				this._publish('stateStarted', this.state);
			}
		},
		
		endState: function () {
			if (this.state === null) {
				this._publish('error', "Cannot end state: match ended.");
			} else if (!this.stateStarted) {
				this._publish('error', "Cannot end state: not yet started.");
			} else {
				this.stateStarted = false;
				this._publish('stateEnded', this.state);
				
				// Move to next state
				this._nextState();
			}
		},
		
		startEndInjury: function () {
			this.injuryStarted = !this.injuryStarted;
			if (this.injuryStarted) {
				this._publish('injuryStarted', this.state);
			} else {
				this._publish('injuryEnded', this.state);
			}
		},
		
		setScoringState: function (enabled) {
			this.scoringEnabled = enabled;
			this._publish('scoringStateChanged', enabled);
		},
		
		score: function (judgeId, competitor, points) {
			var scoreboard = this.scoreboards[judgeId];
			var scores = scoreboard[scoreboard.length - 1].values;
			var competitorIndex = (competitor === Competitors.HONG ? 0 : 1);
			
			scores[competitorIndex] += points;
			
			this._publish('judgeScoresUpdated', judgeId, scores.slice(0));
		},
		
		eraseScoreboard: function (judgeId) {
			delete this.scoreboards[judgeId];
		}
		
	};
	
	return Match;
	
});
