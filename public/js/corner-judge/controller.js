
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./widget/name-view',
	'./widget/ring-list-view',
	'./widget/authorisation-view',
	'./widget/round-view',
	'../common/ws-error-view',
	'../common/backdrop'

], function (PubSub, Helpers, IO, NameView, RingListView, AuthorisationView, RoundView, WsErrorView, Backdrop) {
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Flags
		this.isJPConnected = false;
		this.isScoringEnabled = false;
		
		// Initialise views
		this.curentView = null;
		this.wsErrorView = new WsErrorView();
		this.nameView = new NameView();
		this.ringListView = new RingListView();
		this.authorisationView = new AuthorisationView();
		this.roundView = new RoundView();
		this.backdrop = new Backdrop();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				identify: this._showView.bind(this, this.nameView),
				idSuccess: this._showView.bind(this, this.ringListView),
				confirmIdentity: IO.sendIdentityConfirmation,
				waitingForAuthorisation: this._showView.bind(this, this.authorisationView),
				rejected: this._showView.bind(this, this.ringListView),
				ringJoined: this._onRingJoined,
				ringLeft: this._onRingLeft,
				jpConnectionStateChanged: this._onJPConnectionStateChanged,
				scoringStateChanged: this._onScoringStateChanged,
				restoreSession: this._onRestoreSession,
				wsError: this._showView.bind(this, this.wsErrorView)
			}
		});
	}
	
	Controller.prototype = {

		_showView: function(view) {
			// Hide the previously visible view
			if (this.curentView) {
				this.curentView.root.classList.add('hidden');
			}
			
			// Show the new view
			view.root.classList.remove('hidden');
			this.curentView = view;
		},

		_updateBackdrop: function() {
			if (!this.isJPConnected) {
				this.backdrop.show("Jury President disconnected", "Waiting for reconnection...");
			} else if (!this.isScoringEnabled) {
				this.backdrop.show("Please wait for round to begin", "... or timeout to end");
			} else {
				this.backdrop.hide();
			}
		},

		_onRingJoined: function(data) {
			console.log("Joined ring (index=" + data.ringIndex + ")");
			
			// Show round view
			this._showView(this.roundView);

			// Update flags and backdrop
			this.isScoringEnabled = data.scoringEnabled;
			this.isJPConnected = data.jpConnected;
			this._updateBackdrop();
			
			// Update page title to show ring number
			document.title = "Corner Judge | Ring " + (data.ringIndex + 1);
		},

		/**
		 * Corner Judge has left the ring, willingly or not.
		 */
		_onRingLeft: function(data) {
			// Show ring list view
			this._showView(this.ringListView);
			
			// Reset page title
			document.title = "Corner Judge";
		},

		_onJPConnectionStateChanged: function(data) {
			console.log("Jury president " + (data.connected ? "connected" : "disconnected"));
			this.isJPConnected = data.connected;
			this._updateBackdrop();
		},

		_onScoringStateChanged: function(data) {
			console.log("Scoring " + (data.enabled ? "enabled" : "disabled"));
			this.isScoringEnabled = data.enabled;
			this._updateBackdrop();
		},
		
		_onRestoreSession: function(data) {
			console.log("Restoring session");

			// Init ring list view with ring state data
			this.ringListView.init(data.ringStates);

			// If no ring was joined yet, show ring list view
			if (data.ringIndex === -1) {
				this._showView(this.ringListView);

			// If a ring was joined, but JP had not authorised the request yet, show authorisation view
			} else if (!data.authorised) {
				this._showView(this.authorisationView);

			// If JP was authorised by CJ to join a ring, show round view
			} else {
				this._onRingJoined(data);
			}

			IO.sessionRestored();
		}

	};
	
	return Controller;
	
});
