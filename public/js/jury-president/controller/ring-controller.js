
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
				newCornerJudge: this._onNewCornerJudge
			},
			ring: {},
			ringView: {}
		};	
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, this.events);
	}
	
	RingController.prototype = {
		
		_onNewCornerJudge: function (judge) {
			console.log("New corner judge (id=" + judge.id + ")");
			
			// Find unallocated judge slot
			for (var i = 0, len = this.judgeSlotControllers.length; i < len; i += 1) {
				if (this.judgeSlotControllers[i].model === null) {
					this.judgeSlotControllers[i].attachJudge(judge.id, judge.name);
					return;
				}
			}
			
			// If no unallocated slot was found, the ring is full
			this._ringIsFull(judge.id);
		},
		
		_ringIsFull: function (judgeId) {
			console.log("Ring is full");
			IO.ringIsFull(judgeId);
		}
		
	};
	
	return RingController;
	
});
