
define([
	'handlebars',
	'../../common/helpers',
	'../../common/states',
	'../widget/timer'

], function (Handlebars, Helpers, MatchStates, Timer) {
	
	function MatchPanel(io) {
		this.root = document.getElementById('match-panel');
		this.config = null;
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'matchPanel', [
			'enablePenaltyBtns',
			'updateScoreSlots',
			'updatePenalties'
		],{
			io: {
				matchStateChanged: this.onMatchStateChanged,
				matchEnded: this.onMatchEnded,
				matchPanel: {
					state: this.updateState,
				}
			},
			timer: {
				tick: this.onTimerTick,
				zero: this.onTimerZero
			}
		}, this);
		
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
		this.penaltiesTemplate = Handlebars.compile(document.getElementById('pe-penalties-tmpl').innerHTML);
		this.warningsInner = this.root.querySelector('.pe-inner--warnings');
		this.warningsInner.addEventListener('click', this._onWarningsInnerDelegate.bind(this));
		this.foulsInner = this.root.querySelector('.pe-inner--fouls');
		this.foulsInner.addEventListener('click', this._onFoulsInnerDelegate.bind(this));
	}
	
	MatchPanel.prototype.slideInjuryTimer = function slideInjuryTimer() {
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
	};


	/* ==================================================
	 * IO events
	 * ================================================== */

	MatchPanel.prototype.onMatchStateChanged = function onMatchStateChanged(data) {
		console.log("Match state changed", data.state);
		var state = data.state.state;

		switch (data.state.latestEvent) {
			case MatchStates.events.NEXT:
				// Reset round timer
				this.roundTimer.timer.reset(
					(state === MatchStates.BREAK ? data.config.breakTime :
					(state === MatchStates.GOLDEN_POINT ? 0 : data.config.roundTime)));

				// Update state text
				this.mpState.textContent = state.split('-').reduce(function (label, part) {
					return label += part.charAt(0).toUpperCase() + part.slice(1) + " ";
				}, "").slice(0, -1);
				break;

			case MatchStates.events.STARTED:
				// Start timer
				this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, false);
				break;

			case MatchStates.events.ENDED:
				// Stop timer
				this.roundTimer.timer.stop();
				break;

			case MatchStates.events.INJURY_STARTED:
				this._slideInjuryTimer();
				this.timeKeeping.classList.add('tk_injury');

				this.injuryTimer.timer.reset(data.config.injuryTime);
				this.injuryTimer.timer.start(true, true);
				this.roundTimer.timer.stop();
				break;

			case MatchStates.events.INJURY_ENDED:
				this._slideInjuryTimer();
				this.timeKeeping.classList.remove('tk_injury');

				this.injuryTimer.timer.stop();
				this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, true);
				break;

			default:
		}
	};

	MatchPanel.prototype.enablePenaltyBtns = function enablePenaltyBtns(data) {
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
	};

	MatchPanel.prototype.onMatchEnded = function onMatchEnded() {
		console.log("Match ended");

		// Reset timer
		this.roundTimer.timer.reset(0);
	};


	/* ==================================================
	 * Other events
	 * ================================================== */

	MatchPanel.prototype.onTimerTick = function onTimerTick(name, value) {
		var timer = this[name + 'Timer'];
		var sec = value % 60
		timer.sec.textContent = (sec < 10 ? '0' : '') + sec;
		timer.min.textContent = Math.floor(value / 60);
	};

	MatchPanel.prototype.onTimerZero = function () {
		this.tkBeeps.play();
	};


	/* ==================================================
	 * UI updates
	 * ================================================== */

	MatchPanel.prototype.updateState = function updateState(data) {
		data.state.enableInjuryBtn = data.state.stateStarted & !data.state.isBreak;
		this.stateInner.innerHTML = this.stateInnerTemplate(data.state);
	};

	MatchPanel.prototype.updateScoreSlots = function updateScoreSlots(data) {
		this.scoresInner.innerHTML = this.scoresInnerTemplate(data);
	};

	MatchPanel.prototype.updatePenalties = function updatePenalties(data) {
		Object.keys(data.penalties).forEach(function (key) {
			var penalties = data.penalties[key];
			penalties.allowDecHong = penalties.hong > 0;
			penalties.allowDecChong = penalties.chong > 0;

			this[key + 'Inner'].innerHTML = this.penaltiesTemplate(penalties);
		}, this);
	};


	/* ==================================================
	 * UI events
	 * ================================================== */

	MatchPanel.prototype.onStateInnerDelegate = function onStateInnerDelegate(evt) {
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
	};

	MatchPanel.prototype.onWarningsInnerDelegate = function onWarningsInnerDelegate(evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			if (btn.classList.contains('pe-inc')) {
				IO.incrementPenalty('warning', btn.dataset.competitor);
			} else if (btn.classList.contains('pe-dec')) {
				IO.decrementPenalty('warning', btn.dataset.competitor);
			}
		}
	};

	MatchPanel.prototype.onFoulsInnerDelegate = function onFoulsInnerDelegate(evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			if (btn.classList.contains('pe-inc')) {
				IO.incrementPenalty('foul', btn.dataset.competitor);
			} else if (btn.classList.contains('pe-dec')) {
				IO.decrementPenalty('foul', btn.dataset.competitor);
			}
		}
	};
	
	return MatchPanel;
	
});
