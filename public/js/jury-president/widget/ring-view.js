
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io',
	'../defaults',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (PubSub, Handlebars, Helpers, IO, defaults, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
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
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged,
				cornerJudgeScored: this._onCornerJudgeScored
			},
			ring: {
				full: this._onRingFull
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
		
		_onCornerJudgeScored: function (score) {
			this.ring.judgeScored(score.judgeId, score.competitor, score.points);
		},
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewMatchBtn: function () {
			this.ring.newMatch(this.configPanel.getConfig());
			this._showPanel(this.matchPanel);
		},
		
		_onMatchConfigBtn: function () {
			this.ring.clearMatch();
			this._showPanel(this.configPanel);
		},
		
		_onMatchResultBtn: function () {
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
	
	return RingView;
	
});
