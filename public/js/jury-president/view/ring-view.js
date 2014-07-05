
define(['minpubsub', 'handlebars', '../defaults', './judges-sidebar'], function (PubSub, Handlebars, defaults, JudgesSidebar) {
	
	function RingView() {
		this.root = document.getElementById('ring-view');
		this.judgesSidebar = new JudgesSidebar(defaults.judgesPerRing); 
	}
	
	RingView.prototype = {
		
		
		
	};
	
	return RingView;
	
});
