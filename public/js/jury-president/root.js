
define([
	'../common/helpers',
	'../common/login-view',
	'../common/ring-list-view',
	'./ring-view'

], function (Helpers, LoginView, RingListView, RingView) {
	
	function Root(io) {
		// Initialise views
		this.currentView = null;
		this.loginView = new LoginView(io);
		this.ringListView = new RingListView(io);
		this.ringView = new RingView(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'root', ['showView'], this);
	}
	
	Root.prototype.showView = function (data) {
		// Hide the previously visible view
		if (this.curentView) {
			this.curentView.root.classList.add('hidden');
		}

		// Show the new view
		this.curentView = this[data.view];
		this.curentView.root.classList.remove('hidden');
	};
	
	return Root;
	
});
