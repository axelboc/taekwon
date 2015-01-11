
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io',
	'../model/match-states',
	'../model/timer'

], function (PubSub, Handlebars, Helpers, IO, MatchStates, Timer) {
	
	function MatchPanel() {
		this.root = document.getElementById('match-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				matchEnded: this._onMatchEnded,
				scoringStateChanged: this._onScoringStateChanged,
				matchPanel: {
					state: this._updateState,
					scores: this._updateScores,
					penalties: this._updatePenalties
				}
			},
			match: {
				ended: IO.endMatch,
				stateChanged: this._onStateChanged,
				stateStarted: this._onStateStarted,
				stateEnded: this._onStateEnded,
				injuryStarted: this._onInjuryStarted,
				injuryEnded: this._onInjuryEnded,
				scoresReset: this._updateJudgeScores,
				penaltiesReset: this._onPenaltiesReset
			},
			judge: {
				scored: this._updateJudgeScores,
				undid: this._updateJudgeScores
			},
			timer: {
				tick: this._onTimerTick,
				zero: this._onTimerZero
			}
		});
		
		// Match state
		this.mpState = this.root.querySelector('.mp-state');
		
		// Time keeping
		this.timersSliding = false;
		this.timeKeeping = this.root.querySelector('.time-keeping');
		this.tkBeeps = document.getElementById('tk-beeps');
		this.tkInner = this.timeKeeping.querySelector('.tk-inner');
		
		this.roundTimer = {
			timer: new Timer('round'),
			min: this.timeKeeping.querySelector('.tk-timer--round > .tk-timer-min'),
			sec: this.timeKeeping.querySelector('.tk-timer--round > .tk-timer-sec')
		};
		
		this.injuryTimer = {
			timer: new Timer('injury'),
			min: this.timeKeeping.querySelector('.tk-timer--injury > .tk-timer-min'),
			sec: this.timeKeeping.querySelector('.tk-timer--injury > .tk-timer-sec')
		};
		
		// Match state
		this.stateInner = this.root.querySelector('.st-inner');
		this.stateInnerTemplate = Handlebars.compile(document.getElementById('st-inner-tmpl').innerHTML);
		this.stateInner.addEventListener('click', this._onStateInnerDelegate.bind(this));
		
		// Scores
		this.scoresInner = this.root.querySelector('.sc-inner');
		this.scoresInnerTemplate = Handlebars.compile(document.getElementById('sc-inner-tmpl').innerHTML);
		
		// Penalties
		this.penaltiesInner = this.root.querySelector('.pe-inner');
		this.penaltiesInnerTempalte = Handlebars.compile(document.getElementById('pe-inner-tmpl').innerHTML);
		this.penaltiesInner.addEventListener('click', this._onPenaltiesInnerDelegate.bind(this));
	}
	
	MatchPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('matchPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onTimerTick: function (name, value) {
			var timer = this[name + 'Timer'];
			var sec = value % 60
			timer.sec.textContent = (sec < 10 ? '0' : '') + sec;
			timer.min.textContent = Math.floor(value / 60);
		},
		
		_onTimerZero: function () {
			this.tkBeeps.play();
		},

		_slideInjuryTimer: function () {
			// Transition end event listener
			var slidingEnd = function () {
				// Remove listener
				this.tkInner.removeEventListener('transitionend', slidingEnd);

				// Timer intervals start after a delay of 600ms =
				// 300ms to account for the sliding transition + 300ms for usability purposes
				window.setTimeout(function () {
					this.timersSliding = false;
				}.bind(this), 300);
			};
			
			if (!this.timersSliding) {
				// Prevent action on buttons while timers are sliding
				this.timersSliding = true;
				this.tkInner.addEventListener('transitionend', slidingEnd.bind(this));
			}
		},
		
		setMatch: function (match) {
			this.match = match;
			this.match.nextState();
			
			// Initialise UI
			this._updateStateBtns(null, false);
			this.stateStartBtn.classList.remove('hidden');
			this.stateEndBtn.classList.remove('hidden');
			this._updateJudgeScores();
			this._enablePenaltyBtns(false);
		},

		_onStateChanged: function (state) {
			console.log("State changed: " + state);
			
			// Reset round timer
			this.roundTimer.timer.reset((state === MatchStates.BREAK ? this.match.config.breakTime :
								(state === MatchStates.GOLDEN_POINT ? 0 : this.match.config.roundTime)));

			// Update state text
			this.mpState.textContent = state.split('-').reduce(function (label, part) {
				return label += part.charAt(0).toUpperCase() + part.slice(1) + " ";
			}, "").slice(0, -1);

			// Mark start button as major on non-BREAK states
			this.stateStartBtn.classList.toggle('btn--major', state !== MatchStates.BREAK);
			this.stateEndBtn.classList.toggle('btn--major', state !== MatchStates.BREAK);
		},

		_onStateStarted: function (state) {
			console.log("State started: " + state);
			this._updateStateBtns(state, true);

			this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, false);

			if (state !== MatchStates.BREAK) {
				IO.enableScoring(true);
			}
		},

		_onStateEnded: function (state) {
			console.log("State ended: " + state);
			this._updateStateBtns(state, false);
			this.roundTimer.timer.stop();

			if (state !== MatchStates.BREAK) {
				IO.enableScoring(false);
			}
		},

		_updateStateBtns: function (state, starting) {
			// State start/end buttons
			Helpers.enableBtn(this.stateEndBtn, starting);
			Helpers.enableBtn(this.stateStartBtn, !starting);

			// Enable injury button when a non-BREAK state is starting
			Helpers.enableBtn(this.injuryBtn, starting && state !== MatchStates.BREAK);
		},

		_onMatchEnded: function () {
			console.log("Match ended");
			this.stateStartBtn.classList.add("hidden");
			this.stateEndBtn.classList.add("hidden");
			this.roundTimer.timer.reset(0);
		},
		
		_onPenaltiesReset: function (state) {
			// If Round 2, keep penalties from Round 1 on screen
			if (state !== MatchStates.ROUND_2) {
				// Reset values
				[].forEach.call(this.penalties.querySelectorAll('.pe-value'), function (elem) {
					elem.textContent = 0;
				}, this);
				
				// Disable decrement buttons
				[].forEach.call(this.penalties.querySelectorAll('.pe-dec'), function (btn) {
					btn.setAttribute('disabled', 'disabled');
					btn.classList.add('pe-btn_disabled');
				}, this);
			}
		},
		
		_enablePenaltyBtns: function (enable) {
			[].forEach.call(this.penaltyBtns, function (btn) {
				if (!enable) {
					btn.setAttribute('disabled', 'disabled');
				} else if (!btn.classList.contains('pe-btn_disabled')) {
					btn.removeAttribute('disabled');
				}
			});
		},
		
		_onPenaltyItem: function (item, evt) {
			var elem = evt.target;
			if (!elem || elem.nodeName !== 'BUTTON') {
				return;
			}
			
			elem.blur();
			var type = item.dataset.type;
			var competitor = item.dataset.competitor;
			
			var valueElem = item.querySelector('.pe-value');
			var value = parseInt(valueElem.textContent);
			
			// Increment or decrement time
			if (elem.classList.contains('pe-inc')) {
				IO.incrementPenalty(type, competitor);
				value += 1;
				
				if (value === 1) {
					elem.nextElementSibling.removeAttribute('disabled');
					elem.nextElementSibling.classList.remove('pe-btn_disabled');
				}
			} else if (elem.classList.contains('pe-dec')) {
				IO.decrementPenalty(type, competitor);
				value -= 1;
				
				if (value === 0) {
					elem.setAttribute('disabled', 'disabled');
					elem.classList.add('pe-btn_disabled');
				}
			}
			
			// Display new value
			valueElem.textContent = value;
		},
		
		
		
		/* ==================================================
		 * IO events
		 * ================================================== */
		
		_onScoringStateChanged: function (data) {
			this._enablePenaltyBtns(data.enabled);
		},

		_onInjuryStarted: function () {
			Helpers.enableBtn(this.stateEndBtn, false);
			this.injuryBtn.textContent = "End Injury";
			
			this._slideInjuryTimer();
			this.timeKeeping.classList.add('tk_injury');

			this.injuryTimer.timer.reset(this.match.config.injuryTime);
			this.injuryTimer.timer.start(true, true);
			this.roundTimer.timer.stop();
		},

		_onInjuryEnded: function (data) {
			Helpers.enableBtn(this.stateEndBtn, true);
			this.injuryBtn.textContent = "Start Injury";
			
			this._slideInjuryTimer();
			this.timeKeeping.classList.remove('tk_injury');

			this.injuryTimer.timer.stop();
			this.roundTimer.timer.start(data.state !== MatchStates.GOLDEN_POINT, true);
		},
		
		
		/* ==================================================
		 * UI updates
		 * ================================================== */
		
		_updateStateManagement: function (state) {
			this.smInner.innerHTML = this.smInnerTemplate(state);
		},
		
		_updateScores: function (scores) {
			this.scoresInner.innerHTML = this.scoresInnerTemplate(scores);
			
			// Prepare template context
			/*var slots = [];
			for (var i = 0, len = this.ring.slotCount; i < len; i += 1) {
				var cj = this.ring.cornerJudges[i];
				slots.push({
					index: i + 1,
					cj: !cj ? null : {
						name: cj.name,
						scores: cj.getCurrentScores(this.match.scoreboardColumnId)
					}
				});
			};*/
		},
		
		_updatePenalties: function (penalties) {
			this.penalties.innerHTML = this.penaltiesTempalte(penalties);
		},
		
		
		/* ==================================================
		 * UI events
		 * ================================================== */
		
		_onStateInnerDelegate: function (evt) {
			var btn = evt.target;
			if (btn && btn.nodeName == 'BUTTON') {
				btn.blur();
				if (btn.classList.contains('st-btn--start')) {
					IO.startMatchState();
				} else if (btn.classList.contains('st-btn--end')) {
					if (!this.timersSliding) {
						IO.endMatchState();
					}
				} else if (btn.classList.contains('st-btn--injury')) {
					IO.startEndInjury();
				}
			}
		},
		
		_onPenaltiesInnerDelegate: function (evt) {
			var btn = evt.target;
			if (btn && btn.nodeName == 'BUTTON') {
			}
		}
		
	};
	
	return MatchPanel;
	
});
