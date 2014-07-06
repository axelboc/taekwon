
define([
	'minpubsub',
	'handlebars',
	'../defaults',
	'./judge-slot-view'

], function (PubSub, Handlebars, defaults, JudgeSlotView) {
	
	function RingView(model) {
		this.model = model;
		this.root = document.getElementById('ring');
		this.judgeList = this.root.querySelector('.judge-list');
		this.judgeListTemplate = Handlebars.compile(document.getElementById('judge-list-tmpl').innerHTML);
		
		// Prepare judge list template context
		var judgeIndices = [];
		for (var i = 0; i < defaults.judgesPerRing; i += 1) {
			judgeIndices.push(i + 1);
		}
		
		// Execute judge list template
		this.judgeList.innerHTML = this.judgeListTemplate({
			judgeIndices: judgeIndices
		});
		
		// Create judge slot views
		this.judgeSlotViews = [];
		[].forEach.call(this.judgeList.querySelectorAll('.judge'), function (slotRoot, slotIndex) {
			this.judgeSlotViews.push(new JudgeSlotView(slotRoot, slotIndex));
		}, this);
	}
	
	RingView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringView.' + subTopic, [].slice.call(arguments, 1));
		}
		
	};
	
	return RingView;
	
});
