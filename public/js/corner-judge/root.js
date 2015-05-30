
define([
	'../common/helpers',
	'../common/login-view',
	'./widget/ring-list-view',
	'./widget/authorisation-view',
	'./widget/round-view',
	'../common/backdrop'

], function (Helpers, LoginView, RingListView, AuthorisationView, RoundView, Backdrop) {
	
	function Root(io) {
		// Initialise views
		this.curentView = null;
		this.loginView = new LoginView(io);
		this.ringListView = new RingListView(io);
		this.authorisationView = new AuthorisationView(io);
		this.roundView = new RoundView(io);
		this.backdrop = new Backdrop(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io.primus, 'root', ['showView'], this);
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
