
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
		this.match = null;
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			match: {
				created: this._onMatchCreated,
				ended: this._onMatchEnded,
				stateChanged: this._onStateChanged,
				stateStarted: this._onStateStarted,
				stateEnded: this._onStateEnded,
				injuryStarted: this._onInjuryStarted,
				injuryEnded: this._onInjuryEnded,
				judgeScoresUpdated: this._onJudgeScoresUpdated
			},
			timer: {
				tick: this._onTimerTick
			}
		});
		
		// Time keeping
		this.timeKeeping = this.root.querySelector('.time-keeping');
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
		this.matchResultBtn.addEventListener('click', this._onMatchResultBtn.bind(this));
		this.injuryBtn.addEventListener('click', this._onInjuryBtn.bind(this));
		
		// Scoring
		this.scoring = this.root.querySelector('.scoring');
		var scoringInner = this.scoring.querySelector('.sc-inner');
		var scoringTmpl = Handlebars.compile(document.getElementById('sc-judge-tmpl').innerHTML);
		scoringInner.innerHTML = scoringTmpl();
		this.judgeScores = scoringInner.querySelectorAll('.sc-judge');
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
			this.match.endState();
		},

		_onMatchResultBtn: function () {
			this._publish('showResult');
		},

		_onInjuryBtn: function (evt) {
			evt.target.blur();
			this.match.startEndInjury();
		},
		
		_onMatchCreated: function (match) {
			console.log("Match created");
			this.match = match;
			this._updateStateBtns(null, false);
			this.matchResultBtn.classList.add("hidden");
			this.stateStartBtn.classList.remove("hidden");
			this.stateEndBtn.classList.remove("hidden");
		},

		_onStateChanged: function (state) {
			var stateStr = state.toLowerCase().replace('-', ' ');
			console.log("State changed: " + stateStr);

			// Reset round timer
			this.roundTimer.timer.reset((state === MatchStates.BREAK ? this.match.config.breakTime :
								(state === MatchStates.GOLDEN_POINT ? 0 : this.match.config.roundTime)));

			// Update text of start and end buttons
			this.stateStartBtn.textContent = "Start " + stateStr;
			this.stateEndBtn.textContent = "End " + stateStr;

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
			this.matchResultBtn.classList.remove("hidden");
			this.roundTimer.timer.reset(0);
		},

		_onInjuryStarted: function () {
			Helpers.enableBtn(this.stateEndBtn, false);
			this.injuryBtn.textContent = "End injury";
			this.timeKeeping.classList.add('tk_injury');

			this.injuryTimer.timer.reset(this.match.config.injuryTime);
			this.injuryTimer.timer.start(true, true);
			this.roundTimer.timer.stop();

			IO.enableScoring(false);
		},

		_onInjuryEnded: function (state) {
			Helpers.enableBtn(this.stateEndBtn, true);
			this.injuryBtn.textContent = "Start injury";
			this.timeKeeping.classList.remove('tk_injury');

			this.injuryTimer.timer.stop();
			this.roundTimer.timer.start(state !== MatchStates.GOLDEN_POINT, true);

			IO.enableScoring(true);
		},
		
		_onJudgeScoresUpdated: function (judgeId, scores) {
			//this.judgesById[judgeId].scoreHong.textContent = scores[0];
			//this.judgesById[judgeId].scoreChong.textContent = scores[1];
		}
		
	};
	
	return MatchPanel;
	
});
