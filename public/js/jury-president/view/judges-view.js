
define(['minpubsub', 'handlebars'], function (PubSub, Handlebars) {
	
	function JudgesView(judgeCount) {
		this.root = document.getElementById('judges-sidebar');
		this.judgesList = this.root.querySelector('.judges-list');
		this.template = Handlebars.compile(document.getElementById('judge-tmpl').innerHTML);
		
		this.slots = [];
		for (var i = 0; i < judgeCount; i += 1) {
			this.slots.push({
				index: i + 1,
				judge: null
			});
		}
		
		this.judgesList.innerHTML = this.template({
			slots: this.slots
		});
	}
	
	JudgesView.prototype = {
		
		
		
	};
	
	return JudgesView;
	
});
