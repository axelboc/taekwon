
define([
	'../common/helpers',
	'./widget/name-view',
	'./widget/ring-list-view',
	'./widget/authorisation-view',
	'./widget/round-view',
	'../common/backdrop'

], function (Helpers, NameView, RingListView, AuthorisationView, RoundView, Backdrop) {
	
	function Root(io) {
		// Initialise views
		this.curentView = null;
		this.nameView = new NameView(io);
		this.ringListView = new RingListView(io);
		this.authorisationView = new AuthorisationView(io);
		this.roundView = new RoundView(io);
		this.backdrop = new Backdrop(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'root', {
			io: {
				identify: this._showView.bind(this, this.nameView),
				idSuccess: this._showView.bind(this, this.ringListView),
				confirmIdentity: IO.sendIdentityConfirmation,
				waitingForAuthorisation: this._showView.bind(this, this.authorisationView),
				rejected: this._showView.bind(this, this.ringListView),
				ringJoined: this._showView.bind(this, this.roundView),
				ringLeft: this._showView.bind(this, this.ringListView),
			}
		}, this);
	}
	
	Root.prototype._showView = function(view) {
		// Hide the previously visible view
		if (this.curentView) {
			this.curentView.root.classList.add('hidden');
		}

		// Show the new view
		view.root.classList.remove('hidden');
		this.curentView = view;
	};

	return Root;
	
});
