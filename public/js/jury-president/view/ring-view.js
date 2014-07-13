
define([
	'minpubsub',
	'handlebars',
	'../defaults'

], function (PubSub, Handlebars, defaults) {
	
	function RingView(model) {
		this.model = model;
		this.root = document.getElementById('ring');
		
		this.newBtns = this.root.querySelectorAll('.match-btn--new');
		this.configBtn = this.root.querySelector('.match-btn--config');
		this.resultBtn = this.root.querySelector('.sm-btn--result');
		
		[].forEach.call(this.newBtns, function (btn) {
			btn.addEventListener('click', this._publish.bind(this, 'newBtnClicked'));
		}, this);
		this.configBtn.addEventListener('click', this._publish.bind(this, 'configBtnClicked'));
		this.resultBtn.addEventListener('click', this._publish.bind(this, 'resultBtnClicked'));
	}
	
	RingView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringView.' + subTopic, [].slice.call(arguments, 1));
		}
		
	};
	
	return RingView;
	
});
