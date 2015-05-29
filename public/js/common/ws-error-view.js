
define([
	'minpubsub',
	'./helpers'

], function (Helpers) {
	
	function WsErrorView(io) {
		this.root = document.getElementById('ws-error');
		
		this.instr = this.root.querySelector('.wse-instr');
		this.retryBtn = this.root.querySelector('.wse-btn--retry');
		
		this.retryBtn.addEventListener('click', this.onRetryBtn.bind(this));
	}
	
	WsErrorView.prototype.setInstr = function setInstr(message) {
		this.instr.textContent = message;
	};
		
	WsErrorView.prototype.onRetryBtn = function onRetryBtn() {
		window.location.reload();
	};
	
	return WsErrorView;
	
});
