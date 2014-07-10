
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'./judge-slot-controller'
	
], function (PubSub, Helpers, IO, JudgeSlotController) {
	
	function RingController(model, view) {
		this.model = model;
		this.view = view;
		
		this.judgeSlotControllers = [];
		this.view.judgeSlotViews.forEach(function (judgeSlotView) {
			this.judgeSlotControllers.push(new JudgeSlotController(judgeSlotView.index, judgeSlotView));
		}, this);
		
		// Build events object
		this.events = {
			io: {
				newCornerJudge: this._onNewCornerJudge,
				cornerJudgeStateChanged: this._onCornerJudgeStateChanged
			},
			ring: {},
			ringView: {}
		};	
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, this.events);
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
		}
		
	};
	
	return RingController;
	
});
