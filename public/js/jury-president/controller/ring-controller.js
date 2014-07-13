
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../defaults',
	'../view/judges-sidebar',
	'../view/config-panel',
	'../view/match-panel',
	'../view/result-panel',
	'../model/match'
	
], function (PubSub, Helpers, IO, defaults, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel, Match) {
	
	function RingController(ring, view) {
		this.ring = ring;
		this.view = view;
		
		// Initialise sidebar and panels
		this.judgesSidebar = new JudgesSidebar(defaults.judgesPerRing);
		this.configPanel = new ConfigPanel(defaults.match);
		this.matchPanel = new MathPanel();
		this.resultPanel = new ResultPanel();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				newCornerJudge: this._onNewCornerJudge,
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged,
				cornerJudgeScored: this._onCornerJudgeScored
			},
			ring: {
				full: this._onRingFull
			},
			ringView: {
				newBtnClicked: this._onNewBtnClicked,
				configBtnClicked: this._onConfigBtnClicked
			},
			judge: {
				authorised: this._onJudgeAuthorised
			},
			matchPanel: {
				showResult: this._onShowResult
			}
		});
	}
	
	RingController.prototype = {
		
		_onNewCornerJudge: function (judge) {
			console.log("New corner judge (id=" + judge.id + ")");
			this.ring.newJudge(judge.id, judge.name, false, true);
		},
		
		_onRingFull: function () {
			console.log("Ring is full");
			IO.ringIsFull(judge.id);
		},
		
		_onJudgeAuthorised: function (id) {
			console.log("Judge authorised (id=" + id + ")");
			IO.authoriseCornerJudge(id);
		},
		
		_onCornerJudgeStateChanged: function (judge) {
			console.log("Setting judge connection state (connected=" + judge.connected + ")");
			this.ring.judgeStateChanged(judge.id, judge.connected);
		},
		
		_onCornerJudgeScored: function (score) {
			this.ring.judgeScored(score.judgeId, score.competitor, score.points);
		},
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewBtnClicked: function () {
			this.ring.newMatch(this.configPanel.getConfig());
			this._showPanel(this.matchPanel);
		},
		
		_onConfigBtnClicked: function () {
			this._showPanel(this.configPanel);
		},
		
		_onShowResult: function () {
			// TODO: use JS instead of handlebars to populate table to have more control over classes for styling
			var matchContext = {
				penalties: [-1, -2],
				match: {
					hadTwoRounds: this.ring.match.config.roundCount == 2,
					hadTieBreaker: false,
					hadGoldenPoint: false
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
	
	return RingController;
	
});
