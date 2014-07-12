
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../defaults',
	'./judge-slot-controller',
	'../view/config-panel',
	'../view/match-panel',
	'../view/result-panel',
	'../model/match'
	
], function (PubSub, Helpers, IO, defaults, JudgeSlotController, ConfigPanel, MathPanel, ResultPanel, Match) {
	
	function RingController(model, view) {
		this.model = model;
		this.view = view;
		this.match = null;
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				newCornerJudge: this._onNewCornerJudge,
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged,
				cornerJudgeScored: this._onCornerJudgeScored
			},
			ringView: {
				newBtnClicked: this._onNewBtnClicked,
				configBtnClicked: this._onConfigBtnClicked
			},
			matchPanel: {
				showResult: this._onShowResult
			}
		});
		
		// Initialise judge slot controllers
		this.judgeSlotControllers = [];
		this.view.judgeSlotViews.forEach(function (judgeSlotView) {
			this.judgeSlotControllers.push(new JudgeSlotController(judgeSlotView.index, judgeSlotView));
		}, this);
		
		// Initialise panels
		this.configPanel = new ConfigPanel(defaults.match);
		this.matchPanel = new MathPanel();
		this.resultPanel = new ResultPanel();
	}
	
	RingController.prototype = {
		
		_findFreeJudgeSlot: function () {
			for (var i = 0, len = this.judgeSlotControllers.length; i < len; i += 1) {
				// Slot is free if no model is allocated to it
				if (this.judgeSlotControllers[i].model === null) {
					return i;
				}
			}
			// No free slot found
			return -1;
		},
		
		_ringIsFull: function (judgeId) {
			console.log("Ring is full");
			IO.ringIsFull(judgeId);
		},
		
		attachJudgeToSlot: function(slotIndex, id, name, authorised, connected) {
			this.judgeSlotControllers[slotIndex].attachJudge(id, name, authorised, connected);
		},
		
		_onNewCornerJudge: function (judge) {
			console.log("New corner judge (id=" + judge.id + ")");
			
			var slotIndex = this._findFreeJudgeSlot();
			if (slotIndex === -1) {
				// If no unallocated slot is found, the ring is full
				this._ringIsFull(judge.id);
			} else {
				// Otherwise, attach judge to slot
				this.attachJudgeToSlot(slotIndex, judge.id, judge.name, false, true);
			}
		},
		
		_onCornerJudgeStateChanged: function (judge) {
			console.log("Setting judge connection state (connected=" + judge.connected + ")");
			this.judgeSlotControllers.forEach(function (controller) {
				if (controller.model && controller.model.id === judge.id) {
					controller.setConnectionState(judge.connected);
				}
			});
		},
		
		_onCornerJudgeScored: function (score) {
			this.match.score(score.judgeId, score.competitor, score.points);
		},
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewBtnClicked: function () {
			// Retrieve the connected judges
			var judges = this.judgeSlotControllers.reduce(function (arr, controller) {
				if (controller.model) {
					arr.push(controller.model);
				}
				return arr;
			}, []);
			
			// Create new match and show match panel
			this.match = new Match(this.configPanel.getConfig(), judges);
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
					hadTwoRounds: this.match.config.roundCount == 2,
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
