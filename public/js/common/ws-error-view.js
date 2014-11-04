
define([
	'minpubsub',
	'handlebars'

], function (PubSub, Handlebars) {
	
	function WsErrorView() {
		this.root = document.getElementById('ws-error');
		
		this.instr = this.root.querySelector('.wse-instr');
		this.retryBtn = this.root.querySelector('.wse-btn--retry');
		this.retryBtn.addEventListener('click', this._onRetryBtn.bind(this));
	}
	
	WsErrorView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('wsErrorView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onRetryBtn: function () {
			window.location.reload();
		},
		
		updateInstr: function (instr) {
			this.instr.textContent = instr;
		}
		
	};
	
	return WsErrorView;
	
});
