
define([
	'minpubsub',
	'./helpers'

], function (PubSub, Helpers) {
	
	function WsErrorView() {
		this.root = document.getElementById('ws-error');
		
		this.instr = this.root.querySelector('.wse-instr');
		this.retryBtn = this.root.querySelector('.wse-btn--retry');
		
		this.retryBtn.addEventListener('click', this._onRetryBtn.bind(this));
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				wsError: this._onWsError
			}
		});
	}
	
	WsErrorView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('wsErrorView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onWsError: function (data) {
			console.log("Error:", data.reason);
			this.instr.textContent = data.reason;
		},
		
		_onRetryBtn: function () {
			window.location.reload();
		}
		
	};
	
	return WsErrorView;
	
});
