
define(['minpubsub'], function (PubSub) {
	
	function ResultPanel() {
		this.root = document.getElementById('result-panel');
		
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.matchConfigBtn = this.root.querySelector('.match-btn--config');
		
		this.newMatchBtn.addEventListener('click', this._publish.bind(this, 'newMatchBtn'));
		this.matchConfigBtn.addEventListener('click', this._publish.bind(this, 'matchConfigBtn'));
	}
	
	ResultPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('resultPanel.' + subTopic, [].slice.call(arguments, 1));
		}
		
		
		
	};
	
	return ResultPanel;
	
});
