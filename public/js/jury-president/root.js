
define([
	'../common/helpers',
	'./widget/pwd-view',
	'./widget/ring-list-view',
	'./widget/ring-view',
	'../common/backdrop'

], function (Helpers, PwdView, RingListView, RingView, Backdrop) {
	
	function Root(io) {
		// Initialise views and backdrop
		this.currentView = null;
		this.pwdView = new PwdView(io);
		this.ringListView = new RingListView(io);
		this.ringView = new RingView(io);
		this.backdrop = new Backdrop(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'root', {
			identify: this._showView.bind(this, this.pwdView),
			idSuccess: this._showView.bind(this, this.ringListView),
			confirmIdentity: IO.sendIdentityConfirmation,
			ringOpened: this._showView.bind(this, this.ringView)
		}, this);
	}
	
	Root.prototype._showView = function(newView) {
		// Hide the previously visible view
		if (this.currentView) {
			this.currentView.root.classList.add('hidden');
		}

		// Show the new view
		newView.root.classList.remove('hidden');
		this.currentView = newView;
	};
	
	return Root;
	
});
