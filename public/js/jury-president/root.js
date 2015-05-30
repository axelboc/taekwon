
define([
	'../common/helpers',
	'../common/login-view',
	'./widget/ring-list-view',
	'./widget/ring-view',
	'../common/backdrop'

], function (Helpers, LoginView, RingListView, RingView, Backdrop) {
	
	function Root(io) {
		// Initialise views and backdrop
		this.currentView = null;
		this.loginView = new LoginView(io);
		this.ringListView = new RingListView(io);
		this.ringView = new RingView(io);
		this.backdrop = new Backdrop(io);
		
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
