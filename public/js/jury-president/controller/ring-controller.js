
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../defaults',
	'./judge-slot-controller',
	'../view/config-panel',
	'../view/match-panel',
	'../view/result-panel'
	
], function (PubSub, Helpers, IO, defaults, JudgeSlotController, ConfigPanel, MathPanel, ResultPanel) {
	
	function RingController(model, view) {
		this.model = model;
		this.view = view;
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				newCornerJudge: this._onNewCornerJudge,
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged
			},
			ring: {},
			ringView: {
				newBtnClicked: this._onNewBtnClicked,
				configBtnClicked: this._onConfigBtnClicked,
				resultBtnClicked: this._onResultBtnClicked
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
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewBtnClicked: function () {
			this._showPanel(this.matchPanel);
		},
		
		_onConfigBtnClicked: function () {
			this._showPanel(this.configPanel);
		},
		
		_onResultBtnClicked: function () {
			this._showPanel(this.resultPanel);
		}
		
	};
	
	return RingController;
	
});
