
define([
	'minpubsub',
	'../../common/helpers',
	'../io'

], function (PubSub, Helpers, IO) {
	
	function WsErrorView() {
		this.root = document.getElementById('ws-error');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				wsError: this._onWsError
			}
		});
		
		this.instr = this.root.querySelector('.wse-instr');
		this.retryBtn = this.root.querySelector('.wse-btn--retry');
		this.retryBtn.addEventListener('click', this._onRetryBtn.bind(this));
	}
	
	WsErrorView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('wsErrorView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onWsError: function (data) {
			console.log("Error:", data.reason);
			this.wsErrorView.updateInstr(data.reason);
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
