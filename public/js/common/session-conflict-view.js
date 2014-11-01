
define([
	'minpubsub',
	'handlebars'

], function (PubSub, Handlebars) {
	
	function SessionConflictView() {
		this.root = document.getElementById('session-conflict');
		
		this.retryBtn = this.root.querySelector('.scf-btn--retry');
		this.retryBtn.addEventListener('click', this._onRetryBtn.bind(this));
	}
	
	SessionConflictView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('sessionConflictView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onRetryBtn: function () {
			window.location.reload();
		}
		
	};
	
	return SessionConflictView;
	
});
