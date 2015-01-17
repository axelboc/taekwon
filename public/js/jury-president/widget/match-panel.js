
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
				stateChanged: this._onStateChanged,
				stateStarted: this._onStateStarted,
				stateEnded: this._onStateEnded,
				injuryStarted: this._onInjuryStarted,
				injuryEnded: this._onInjuryEnded,
				scoringStateChanged: this._onScoringStateChanged,
				matchEnded: this._onMatchEnded,
				matchPanel: {
					state: this._updateState,
					scores: this._updateScores,
					warnings: this._updateWarnings,
					fouls: this._updateFouls
				}
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
		this.penaltyBtns = this.root.querySelectorAll('.pe-btn');
		this.warningsInner = this.root.querySelector('.pe-inner--warnings');
		this.warningsInnerTemplate = Handlebars.compile(document.getElementById('pe-warnings-tmpl').innerHTML);
		this.warningsInner.addEventListener('click', this._onWarningsDelegate.bind(this));
		this.foulsInner = this.root.querySelector('.pe-inner--fouls');
		this.foulsInnerTemplate = Handlebars.compile(document.getElementById('pe-fouls-tmpl').innerHTML);
		this.foulsInner.addEventListener('click', this._onFoulsDelegate.bind(this));
	}
	
	MatchPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('matchPanel.' + subTopic, [].slice.call(arguments, 1));
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
		
		
		/* ==================================================
		 * IO events
		 * ================================================== */

		_onStateChanged: function (state) {
			console.log("State changed: " + state);
			
			// Reset round timer
			this.roundTimer.timer.reset((state === MatchStates.BREAK ? this.match.config.breakTime :
								(state === MatchStates.GOLDEN_POINT ? 0 : this.match.config.roundTime)));

			// Update state text
			this.mpState.textContent = state.split('-').reduce(function (label, part) {
				return label += part.charAt(0).toUpperCase() + part.slice(1) + " ";
			}, "").slice(0, -1);
		},

		_onStateStarted: function (state) {
			console.log("State started: " + state);

			// Start timer
			this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, false);
		},

		_onStateEnded: function (state) {
			console.log("State ended: " + state);
			
			// Stop timer
			this.roundTimer.timer.stop();
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
		
		_onScoringStateChanged: function (data) {
			// Enable or disable penalty buttons
			[].forEach.call(this.penaltyBtns, function (btn) {
				if (data.enable) {
					// Enable the button, unless it was previously disabled
					if (btn.dataset.wasDisabled === 'true') {
						btn.removeAttribute('disabled');
					}
				} else {
					if (btn.hasAttribute('disabled')) {
						// If the button is already disabled (decrement button when value is 0), 
						// save this information in a data attribute
						btn.dataset.wasDisabled = 'true';
					} else {
						// Disable the button
						btn.setAttribute('disabled', 'disabled');
					}
				}
			});
		},

		_onMatchEnded: function () {
			console.log("Match ended");
			
			// Reset timer
			this.roundTimer.timer.reset(0);
		},
		
		
		/* ==================================================
		 * Other events
		 * ================================================== */
		
		_onTimerTick: function (name, value) {
			var timer = this[name + 'Timer'];
			var sec = value % 60
			timer.sec.textContent = (sec < 10 ? '0' : '') + sec;
			timer.min.textContent = Math.floor(value / 60);
		},
		
		_onTimerZero: function () {
			this.tkBeeps.play();
		},
		
		
		/* ==================================================
		 * UI updates
		 * ================================================== */
		
		_updateState: function (state) {
			this.stateInner.innerHTML = this.stateInnerTemplate(state);
		},
		
		_updateScores: function (scores) {
			this.scoresInner.innerHTML = this.scoresInnerTemplate(scores);
		},
		
		_updateWarnings: function (warnings) {
			this.warningsInner.innerHTML = this.warningsInnerTemplate(warnings);
		},
		
		_updateFouls: function (fouls) {
			this.foulsInner.innerHTML = this.foulsInnerTemplate(fouls);
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
		
		_onWarningsInnerDelegate: function (evt) {
			var btn = evt.target;
			if (btn && btn.nodeName == 'BUTTON') {
				btn.blur();
				if (btn.classList.contains('pe-inc')) {
					IO.incrementWarning(btn.dataset.competitor);
				} else if (btn.classList.contains('pe-dec')) {
					IO.decrementWarning(btn.dataset.competitor);
				}
			}
		},
		
		_onFoulsInnerDelegate: function (evt) {
			var btn = evt.target;
			if (btn && btn.nodeName == 'BUTTON') {
				btn.blur();
				if (btn.classList.contains('pe-inc')) {
					IO.incrementFouls(btn.dataset.competitor);
				} else if (btn.classList.contains('pe-dec')) {
					IO.decrementFouls(btn.dataset.competitor);
				}
			}
		}
		
	};
	
	return MatchPanel;
	
});
