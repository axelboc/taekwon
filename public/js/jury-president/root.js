
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./widget/pwd-view',
	'./widget/ring-list-view',
	'./widget/ring-view',
	'../common/ws-error-view',
	'../common/backdrop'

], function (PubSub, Helpers, IO, PwdView, RingListView, RingView, WsErrorView, Backdrop) {
	
	function Root(io) {
		// Initialise views and backdrop
		this.currentView = null;
		this.pwdView = new PwdView(io);
		this.ringListView = new RingListView(io);
		this.ringView = new RingView(io);
		this.wsErrorView = new WsErrorView(io);
		this.backdrop = new Backdrop(io);
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'root', {
			identify: this._showView.bind(this, this.pwdView),
			idSuccess: this._showView.bind(this, this.ringListView),
			confirmIdentity: IO.sendIdentityConfirmation,
			ringOpened: this._onRingOpened,
			wsError: this._showView.bind(this, this.wsErrorView)
		}, this);
		
		// Listen for errors
		io.on('error', this.onError.bind(this));
	}
	
	Root.prototype.onError = function onError(err) {
		console.error('Error:', err.reason);

		// Reason: "Can't connect to server"
		// => Session cookie not transmitted
		if (err.code === 1002) {
			this.wsErrorView.setInstr("Enable cookies and try again");
			this._showView(this.wsErrorView);
		}
	};
	
	Root.prototype._showView = function(newView) {
		// Hide the previously visible view
		if (this.currentView) {
			this.currentView.root.classList.add('hidden');
		}

		// Show the new view
		newView.root.classList.remove('hidden');
		this.currentView = newView;
	};

	Root.prototype._updateTitle = function(ringIndex) {
		// Update page title to show ring number
		document.title = "Jury President | Ring " + (ringIndex + 1);
	};

	Root.prototype._onRingOpened = function(data) {
		console.log("Ring opened (index=" + data.index + ")");
		this._updateTitle(data.index);
		this._showView(this.ringView);
	};
	
	return Root;
	
});
