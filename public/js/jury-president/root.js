
define([
	'../common/helpers',
	'../common/backdrop',
	'../common/login-view',
	'../common/ring-list-view',
	'./widget/ring-view'

], function (Helpers, Backdrop, LoginView, RingListView, RingView) {
	
	function Root(io) {
		// Initialise backdrop
		this.backdrop = new Backdrop(io);
		
		// Initialise views
		this.currentView = null;
		this.loginView = new LoginView(io);
		this.ringListView = new RingListView(io);
		this.ringView = new RingView(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'root', ['showView'], this);
	}
	
	Root.prototype.showView = function showView(data) {
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
