
define([
	'minpubsub',
	'../common/helpers',
	'./widget/name-view',
	'./widget/ring-list-view',
	'./widget/authorisation-view',
	'./widget/round-view',
	'../common/ws-error-view',
	'../common/backdrop'

], function (PubSub, Helpers, NameView, RingListView, AuthorisationView, RoundView, WsErrorView, Backdrop) {
	
	function Root(io) {
		// Flags
		this.isJPConnected = false;
		this.isScoringEnabled = false;
		
		// Initialise views
		this.curentView = null;
		this.wsErrorView = new WsErrorView(io);
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
				ringJoined: this._onRingJoined,
				ringLeft: this._onRingLeft,
				jpConnectionStateChanged: this._onJPConnectionStateChanged,
				scoringStateChanged: this._onScoringStateChanged
			}
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
	
	Root.prototype._showView = function(view) {
		// Hide the previously visible view
		if (this.curentView) {
			this.curentView.root.classList.add('hidden');
		}

		// Show the new view
		view.root.classList.remove('hidden');
		this.curentView = view;
	};

	Root.prototype._updateBackdrop = function() {
		if (!this.isJPConnected) {
			this.backdrop.show("Jury President disconnected", "Waiting for reconnection...");
		} else if (!this.isScoringEnabled) {
			this.backdrop.show("Please wait for round to begin", "... or timeout to end");
		} else {
			this.backdrop.hide();
		}
	};

	Root.prototype._onRingJoined = function(data) {
		console.log("Joined ring (index=" + data.ringIndex + ")");

		// Show round view
		this._showView(this.roundView);

		// Update flags and backdrop
		this.isScoringEnabled = data.scoringEnabled;
		this.isJPConnected = data.jpConnected;
		this._updateBackdrop();

		// Update page title to show ring number
		document.title = "Corner Judge | Ring " + (data.ringIndex + 1);
	};

	/**
	 * Corner Judge has left the ring, willingly or not.
	 */
	Root.prototype._onRingLeft = function(data) {
		// Show ring list view
		this._showView(this.ringListView);

		// Reset page title
		document.title = "Corner Judge";
	};

	Root.prototype._onJPConnectionStateChanged = function(data) {
		console.log("Jury president " + (data.connected ? "connected" : "disconnected"));
		this.isJPConnected = data.connected;
		this._updateBackdrop();
	};

	Root.prototype._onScoringStateChanged = function(data) {
		console.log("Scoring " + (data.enabled ? "enabled" : "disabled"));
		this.isScoringEnabled = data.enabled;
		this._updateBackdrop();
	};
	
	return Root;
	
});
