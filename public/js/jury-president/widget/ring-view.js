
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io',
	'../defaults',
	'../model/match-states',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (PubSub, Handlebars, Helpers, IO, defaults, MatchStates, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
	function RingView(ring) {
		this.ring = ring;
		this.root = document.getElementById('ring');
		
		// Initialise sidebar and panels
		this.judgesSidebar = new JudgesSidebar(this.ring);
		this.configPanel = new ConfigPanel(this.ring, defaults.match);
		this.matchPanel = new MathPanel(this.ring);
		this.resultPanel = new ResultPanel(this.ring);
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				newCornerJudge: this._onNewCornerJudge,
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged
			},
			ring: {
				full: this._onRingFull,
				matchInProgress: this._onMatchInProgress
			},
			match: {
				created: this._onMatchCreated
			},
			judge: {
				authorised: this._onJudgeAuthorised
			},
			judgesSidebar: {
				judgeDetached: this._onJudgeDetached
			},
			configPanel: {
				newMatchBtn: this._onNewMatchBtn
			},
			matchPanel: {
				matchResultBtn: this._onMatchResultBtn
			},
			resultPanel: {
				matchConfigBtn: this._onMatchConfigBtn
			}
		});
	}
	
	RingView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onNewCornerJudge: function (judge) {
			console.log("New corner judge (id=" + judge.id + ")");
			this.ring.newJudge(judge.id, judge.name, false, true);
		},
		
		_onRingFull: function (judgeId) {
			console.log("Ring is full");
			IO.ringIsFull(judgeId);
		},
		
		_onMatchInProgress: function (judgeId) {
			console.log("Cannot join ring: match in progress");
			IO.matchInProgress(judgeId);
		},
		
		_onJudgeAuthorised: function (id) {
			console.log("Judge authorised (id=" + id + ")");
			IO.authoriseCornerJudge(id);
		},
		
		_onJudgeDetached: function (id) {
			console.log("Judge detached (id=" + id + ")");
			this.ring.judgeDetached(id);
		},
		
		_onCornerJudgeStateChanged: function (judge) {
			console.log("Setting judge connection state (connected=" + judge.connected + ")");
			this.ring.judgeStateChanged(judge.id, judge.connected);
		},
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewMatchBtn: function (btn) {
			btn.blur();
			this.ring.newMatch(this.configPanel.getConfig());
		},
		
		_onMatchCreated: function () {
			this._showPanel(this.matchPanel);
		},
		
		_onMatchConfigBtn: function () {
			this._showPanel(this.configPanel);
		},
		
		_onMatchResultBtn: function () {
			// TODO: use JS instead of handlebars to populate table to have more control over classes for styling
			var match = this.ring.match;
			var states = match.states;
			
			var tmplContext = {
				match: {
					hadTwoRounds: states.indexOf(MatchStates.ROUND_2) !== -1,
					hadTieBreaker: states.indexOf(MatchStates.TIE_BREAKER) !== -1,
					hadGoldenPoint: states.indexOf(MatchStates.GOLDEN_POINT) !== -1
				},
				judges: [{
					name: "Axel",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #2",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #3",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #4",
					results: [23, 25, 12, 34, 45, 46]
				}]
			};

			// Evaluate scoreboard template with match context
			scoreboardWrap.innerHTML = scoreboardTemplate(matchContext);

			// Get scoreboard and cells
			scoreboard = scoreboardWrap.getElementsByClassName('scoreboard')[0];
			scoreboardCells = scoreboard.getElementsByTagName('td');

			// Add classes to scoreboard root
			var gcm = matchContext.match;
			scoreboard.classList.toggle('sb--2-rounds', gcm.hadTwoRounds);
			scoreboard.classList.toggle('sb--tie', gcm.hadTieBreaker);
			scoreboard.classList.toggle('sb--golden-pt', gcm.hadGoldenPoint);

			// Add classes to cells
			var cellsPerRow = matchContext.judges[0].results.length;
			[].forEach.call(scoreboardCells, function (cell, index) {
				cell.classList.add(((index % cellsPerRow) % 2 === 0 ? 'hong-sbg' : 'chong-sbg'));
			})

			this._showPanel(this.resultPanel);
		}
		
	};
	
	return RingView;
	
});
