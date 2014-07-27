
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io',
	'../model/match-states',
	'../model/timer'

], function (PubSub, Handlebars, Helpers, IO, MatchStates, Timer) {
	// TODO: display match state in heading, above buttons
	
	function MatchPanel(ring) {
		this.ring = ring;
		this.match = null;
		this.root = document.getElementById('match-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				cornerJudgeScored: this._onCornerJudgeScored
			},
			ring: {
				slotAdded: this._onSlotAdded,
				slotRemoved: this._onSlotRemoved,
				judgeAttached: this._onJudgeAttached,
				judgeDetached: this._onJudgeDetached
			},
			match: {
				created: this._onMatchCreated,
				ended: this._onMatchEnded,
				stateChanged: this._onStateChanged,
				stateStarted: this._onStateStarted,
				stateEnded: this._onStateEnded,
				injuryStarted: this._onInjuryStarted,
				injuryEnded: this._onInjuryEnded,
				scoringStateChanged: this._onScoringStateChanged,
				scoresReset: this._onScoresReset,
				penaltiesReset: this._onPenaltiesReset
			},
			judge: {
				scoresUpdated: this._onJudgeScoresUpdated
			},
			timer: {
				tick: this._onTimerTick
			}
		});
		
		// Match state
		this.mpState = this.root.querySelector('.mp-state');
		
		// Time keeping
		this.timersSliding = false;
		this.timeKeeping = this.root.querySelector('.time-keeping');
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
		
		// Match state management
		// TODO: bindEvents helper
		this.stateStartBtn = this.root.querySelector('.sm-btn--start');
		this.stateEndBtn = this.root.querySelector('.sm-btn--end');
		this.matchResultBtn = this.root.querySelector('.sm-btn--result');
		this.injuryBtn = this.root.querySelector('.sm-btn--injury');
		
		this.stateStartBtn.addEventListener('click', this._onStateStartBtn.bind(this));
		this.stateEndBtn.addEventListener('click', this._onStateEndBtn.bind(this));
		this.matchResultBtn.addEventListener('click', this._publish.bind(this, 'matchResultBtn'));
		this.injuryBtn.addEventListener('click', this._onInjuryBtn.bind(this));
		
		// Scoring
		this.scoring = this.root.querySelector('.scoring');
		this.scoringInner = this.scoring.querySelector('.sc-inner');
		this.judgeScoringTemplate = Handlebars.compile(document.getElementById('sc-judge-tmpl').innerHTML);
		
		this.judgeScores = [];
		this.judgeScoresById = {};
		
		// Penalties
		this.penalties = this.root.querySelector('.penalties');
		this.penaltyBtns = this.penalties.querySelectorAll('.pe-btn');
		
		// Loop through penalty items
		[].forEach.call(this.root.querySelectorAll('.pe-item'), function (item) {
			// Use event delegation
			item.addEventListener('click', this._onPenaltyItem.bind(this, item));
		}, this);
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

		_onStateStartBtn: function (evt) {
			evt.target.blur();
			this.match.startState();
		},

		_onStateEndBtn: function (evt) {
			evt.target.blur();
			
			if (!this.timersSliding) {
				this.match.endState();
			}
		},
		
		_timersSlidingEnd: function () {
			// Timer intervals start after a delay of 600ms:
			// 300ms to account for the sliding transition, plus 300ms for usability purposes
			window.setTimeout(function () {
				this.timersSliding = false;
			}.bind(this), 300);
			this.tkInner.removeEventListener('transitionend', this._timersSlidingEnd);
		},

		_onInjuryBtn: function (evt) {
			evt.target.blur();
			
			if (!this.timersSliding) {
				// Prevent action on buttons while timers are sliding
				this.timersSliding = true;
				this.tkInner.addEventListener('transitionend', this._timersSlidingEnd.bind(this));

				this.match.startEndInjury();
			}
		},
		
		_onMatchCreated: function (match) {
			console.log("Match created");
			this.match = match;
			this._updateStateBtns(null, false);
			this.matchResultBtn.classList.add('hidden');
			this.stateStartBtn.classList.remove('hidden');
			this.stateEndBtn.classList.remove('hidden');
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
				this.match.setScoringState(true);
				this._enablePenaltyBtns(true);
			}
		},

		_onStateEnded: function (state) {
			console.log("State ended: " + state);
			this._updateStateBtns(state, false);
			this.roundTimer.timer.stop();

			if (state !== MatchStates.BREAK) {
				this.match.setScoringState(false);
				this._enablePenaltyBtns(false);
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
			this.matchResultBtn.classList.remove("hidden");
			this.roundTimer.timer.reset(0);
		},

		_onInjuryStarted: function () {
			Helpers.enableBtn(this.stateEndBtn, false);
			this.injuryBtn.textContent = "End Injury";
			this.timeKeeping.classList.add('tk_injury');

			this.injuryTimer.timer.reset(this.match.config.injuryTime);
			this.injuryTimer.timer.start(true, true);
			this.roundTimer.timer.stop();

			this.match.setScoringState(false);
		},

		_onInjuryEnded: function (state) {
			Helpers.enableBtn(this.stateEndBtn, true);
			this.injuryBtn.textContent = "Start Injury";
			this.timeKeeping.classList.remove('tk_injury');

			this.injuryTimer.timer.stop();
			this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, true);

			this.match.setScoringState(true);
		},
		
		_onSlotAdded: function (index) {
			var elem = document.createElement('div');
			elem.className = 'sc-judge';
			elem.innerHTML = this.judgeScoringTemplate({ index: index + 1 });
			this.scoringInner.appendChild(elem);
			
			this.judgeScores.push({
				root: elem,
				name: elem.querySelector('.sc-judge-name'),
				hong: elem.querySelector('.sc-hong'),
				chong: elem.querySelector('.sc-chong')
			});
		},
		
		_onSlotRemoved: function (index) {
			this.scoringInner.removeChild(this.judgeScores[index].root);
			this.judgeScores.splice(index, 1);
		},
		
		_onJudgeAttached: function (judge) {
			var js = this.judgeScores[judge.index];
			js.name.textContent = judge.name;
			this.judgeScoresById[judge.id] = js;
		},
		
		_onJudgeDetached: function (judge) {
			var js = this.judgeScores[judge.index];
			js.name.textContent = "Judge #" + (judge.index + 1);
			js.hong.textContent = "0";
			js.chong.textContent = "0";
			delete this.judgeScoresById[judge.id];
		},
		
		_onScoringStateChanged: function (enabled) {
			IO.enableScoring(enabled);
		},
		
		_onCornerJudgeScored: function (score) {
			console.log("Judge scored (points=" + score.points + ")");
			this.match.judgeScored(score.judgeId, score.competitor, score.points);
		},
		
		_updateJudgeScores: function (js, scores) {
			js.hong.textContent = scores[0];
			js.chong.textContent = scores[1];
		},
		
		_onJudgeScoresUpdated: function (judgeId, scores) {
			this._updateJudgeScores(this.judgeScoresById[judgeId], scores);
		},
		
		_onScoresReset: function (newScoreboardColumnId) {
			this.judgeScores.forEach(function (js) {
				this._updateJudgeScores(js, [0, 0]);
			}, this);
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
				this.match.incrementPenalty(type, competitor);
				value += 1;
				
				if (value === 1) {
					elem.nextElementSibling.removeAttribute('disabled');
					elem.nextElementSibling.classList.remove('pe-btn_disabled');
				}
			} else if (elem.classList.contains('pe-dec')) {
				this.match.decrementPenalty(type, competitor);
				value -= 1;
				
				if (value === 0) {
					elem.setAttribute('disabled', 'disabled');
					elem.classList.add('pe-btn_disabled');
				}
			}
			
			// Display new value
			valueElem.textContent = value;
		}
		
	};
	
	return MatchPanel;
	
});
