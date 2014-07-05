
define(['minpubsub', 'handlebars', '../defaults', './judges-view'], function (PubSub, Handlebars, defaults, JudgesView) {
	
	function RingView(model) {
		this.model = model;
		this.root = document.getElementById('ring');
		this.JudgesView = new JudgesView(defaults.judgesPerRing);
	}
	
	RingView.prototype = {
		
		
		
	};
	
	return RingView;
	
});
