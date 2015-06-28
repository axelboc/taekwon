
define([
	'../common/helpers',
	'../common/login-view',
	'../common/ring-list-view',
	'./round-view'

], function (Helpers, LoginView, RingListView, RoundView) {
	
	function Root(io) {
		// Initialise views
		this.curentView = null;
		this.loginView = new LoginView(io);
		this.ringListView = new RingListView(io);
		this.authorisationView = {
			root: document.getElementById('authorisation')
		};
		this.roundView = new RoundView(io);
		
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
