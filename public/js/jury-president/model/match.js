
define([
	'minpubsub',
	'../../common/competitors',
	'./match-states'

], function (PubSub, Competitors, MatchStates) {
	
	function Match(config, ring) {
		this.config = config;
		this.ring = ring;
		this.winner = null;
		
		this.state = null;
		this.states = [MatchStates.ROUND_1];
		this.stateIndex = -1;
		
		this.stateStarted = false;
		this.injuryStarted = false;
		this.scoringEnabled = false;
		
		/**
		 * Columns in judges' scoreboards and penalties array.
		 * A column is added for each non-break state during the match, 
		 * as well as when computing the total scores of previous rounds.
		 * Examples of column ID sequences for various matches:
		 * - 1-round match: 		round-1, total-1
		 * - 2-round match: 		round-1, round-2, total-2
		 * - up to golden point: 	round-1, round-2, total-2, tie-breaker, total-4, golden point, total-6
		 */
		this.scoreboardColumns = [];
		// The latest scoreboard column created
		this.scoreboardColumnId;
		
		/**
		 * Penalties ('warnings' and 'fouls') for each scoreboard column (except break states).
		 * Total maluses are stored against 'total' columns (as negative integers).
		 */
		this.penalties = {};
	}
	
	Match.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('match.' + subTopic, [].slice.call(arguments, 1));
		},
		
		/**
		 * Compute maluses from one or more scoreboard columns' penalties, knowing that:
		 * - 3 warnings = -1 pt
		 * - 1 foul 	= -1 pt
		 */
		_computeMaluses: function (columnId) {
			var penalties = this.penalties[columnId];
			
			var maluses = [0, 0];
			for (var i = 0; i <= 1; i += 1) {
				maluses[i] -= Math.floor(penalties.warnings[i] / 3) + penalties.fouls[i];
			}
			
			return maluses;
		},
		
		/**
		 * Ask judges to compute their total scores,
		 * and compute total maluses for the last round(s)
		 */
		_computeTotals: function () {
			// Create a unique key for the new total column
			var totalColumnId = 'total-' + this.scoreboardColumns.length;
			this.scoreboardColumns.push(totalColumnId);
			
			// Compute and store total maluses in penalties object
			var maluses = this._computeMaluses(this.scoreboardColumnId);
			this.penalties[totalColumnId] = maluses;
			
			// Ask judges to compute their total scores
			this.ring.cornerJudges.forEach(function (cj) {
				cj.computeTotal(this.scoreboardColumnId, totalColumnId, maluses);
			}, this);
			
			return totalColumnId;
		},
		
		/**
		 * Compute the winner for the last round(s).
		 */
		_computeWinner: function (totalColumnId) {
			var diff = 0;
			var ties = 0;
			
			// Ask judges to return their winner
			var cjs = this.ring.cornerJudges;
			cjs.forEach(function (cj) {
				// Get winner
				var winner = cj.getWinner(totalColumnId);
				
				// +1 if hong wins, -1 if chong wins, 0 if tie (null)
				diff += winner === Competitors.HONG ? 1 : (winner === Competitors.CHONG ? -1 : 0);
				ties += (!winner ? 1 : 0);
			}, this);
			
			// If majority of ties, match is also a tie
			if (cjs.length > 2 && ties > Math.floor(cjs.length % 2)) {
				return null;
			} else {
				// If diff is positive, hong wins; if it's negative, chong wins; otherwise, it's a tie
				return (diff > 0 ? Competitors.HONG : (diff < 0 ? Competitors.CHONG : null));
			}
		},
		
		/**
		 * Compute the winner, maluses and total scores for the last round(s).
		 */
		_computeResult: function () {
			this.winner = this._computeWinner(this._computeTotals());
			this._publish('resultsComputed');
		},
		
		nextState: function () {
			// If no more states in array, add more if appropriate or end match
			if (this.stateIndex === this.states.length - 1) {
				if (this.state === MatchStates.ROUND_1 && this.config.twoRounds) {
					// Add Break and Round 2 states
					this.states.push(MatchStates.BREAK, MatchStates.ROUND_2);
				} else {
					// Compute the result for the last round(s)
					this._computeResult();
					var isTie = this.winner === null;

					if (this.state !== MatchStates.GOLDEN_POINT && isTie) {
						var tbOrNull = this.config.tieBreaker ? MatchStates.TIE_BREAKER : null;
						var gpOrNull = this.config.goldenPoint ? MatchStates.GOLDEN_POINT : null;
						var eitherOrNull = tbOrNull ? tbOrNull : gpOrNull;
						
						var extraRound = this.state === MatchStates.TIE_BREAKER ? gpOrNull : eitherOrNull;
						if (extraRound) {
							this.states.push(MatchStates.BREAK, extraRound);
						} else {
							this._endMatch();
							return;
						}
					} else {
						this._endMatch();
						return;
					}
				}
			}
			
			this.stateIndex += 1;
			this.state = this.states[this.stateIndex];
			
			if (this.state !== MatchStates.BREAK && this.state !== MatchStates.ROUND_2) {
				// Add a new column to the judges' scoreboards
				this.scoreboardColumnId = this.state === MatchStates.ROUND_1 ? 'main' : this.state;
				this.scoreboardColumns.push(this.scoreboardColumnId);
				this._publish('scoresReset', this.scoreboardColumnId);
				
				// Initialise penalty arrays for new state
				this.penalties[this.scoreboardColumnId] = {
					warnings: [0, 0],
					fouls: [0, 0]
				};
				this._publish('penaltiesReset', this.state);
			}

			this._publish('stateChanged', this.state);
		},
		
		_endMatch: function () {
			this.state = null;
			this._publish('ended');
		},
		
		isInProgress: function () {
			return this.state !== null && (this.stateStarted || this.stateIndex > 0);
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
				this.nextState();
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
		
		incrementPenalty: function (type, competitor) {
			this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] += 1;
		},
		
		decrementPenalty: function (type, competitor) {
			this.penalties[this.scoreboardColumnId][type][competitor === Competitors.HONG ? 0 : 1] -= 1;
		}
		
	};
	
	return Match;
	
});
