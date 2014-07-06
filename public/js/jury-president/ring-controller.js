
define([
	'minpubsub',
	'../common/helpers',
	'./io'
], function (PubSub, Helpers, IO) {
	
	var events = {
		io: {
			newCornerJudge: _onNewCornerJudge
		}
	};
	
	function RingController(model, view) {
		this.model = model;
		this.view = view;
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, events);
	}
	
	RingController.prototype = {
		
		_onNewCornerJudge: function (judge) {
			this.model.newJudge(judge);
		}
		
	};
	
	return RingController;
	
});
