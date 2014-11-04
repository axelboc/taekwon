
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'../common/ws-error-view',
	'./widget/name-view',
	'../common/ring-list-view',
	'./widget/round-view',
	'../common/backdrop'

], function (PubSub, Helpers, IO, WsErrorView, NameView, RingListView, RoundView, Backdrop) {
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				wsError: this._onWsError,
				waitingForId: this._onWaitingForId,
				idSuccess: this._onIdSuccess,
				idFail: this._onIdFail,
				confirmIdentity: this._onConfirmIdentity,
				ringStates: this._onRingStates,
				ringStateChanged: this._onRingStateChanged,
				waitingForAuthorisation: this._onWaitingForAuthorisation,
				ringJoined: this._onRingJoined,
				ringLeft: this._onRingLeft,
				jpConnectionStateChanged: this._onJPConnectionStateChanged,
				scoringStateChanged: this._onScoringStateChanged,
				restoreSession: this._onRestoreSession
			},
			ringListView: {
				ringSelected: this._onRingSelected
			}
		});
		
		// Flags
		this.isAuthorised = false;
		this.isJPConnected = false;
		this.isScoringEnabled = false;
		
		// Initialise views
		this.curentView = null;
		this.wsErrorView = new WsErrorView();
		this.nameView = new NameView();
		this.ringListView = new RingListView();
		// Authorisation view doesn't need to be defined as a separate module
		this.authorisationView = {
			root: document.getElementById('authorisation')
		};
		this.roundView = new RoundView();
		
		// Initialise backdrop
		this.backdrop = new Backdrop();
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
		
		_onWsError: function (data) {
			console.log("Error:", data.reason);
			this.wsErrorView.updateInstr(data.reason);
			this._showView(this.wsErrorView);
		},
		
		_onWaitingForId: function() {
			console.log("Server waiting for identification");
			this._showView(this.nameView);
			this.nameView.init();
		},

		_onIdSuccess: function() {
			console.log("Identification succeeded");
		},

		_onIdFail: function() {
			console.log("Identification failed");
			this.nameView.invalidName();
		},

		_onConfirmIdentity: function () {
			console.log("Server waiting for identity confirmation");
			IO.sendIdentityConfirmation();
		},

		_onRingStates: function(states) {
			console.log("Ring states received (count=\"" + states.length + "\")");
			this.ringListView.init(states);
			this._showView(this.ringListView);
		},

		_onRingStateChanged: function(state) {
			console.log("Ring state changed (index=\"" + state.index + "\")");
			this.ringListView.updateRingBtn(state.index, state.open);
		},

		_onRingSelected: function(index) {
			console.log("Joining ring (index=" + index + ")");
			IO.joinRing(index);
		},
		
		_onWaitingForAuthorisation: function (index) {
			console.log("Waiting for authorisation to join ring");
			this._showView(this.authorisationView);
		},

		_onRingJoined: function(data) {
			console.log("Joined ring (index=" + data.ringIndex + ")");

			// Enable/disable undo button
			Helpers.enableBtn(this.roundView.undoBtn, data.canUndo);
			
			// Show round view
			this._showView(this.roundView);

			// Update flags and backdrop
			this.isAuthorised = true;
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
			console.log(data.message);
			
			// Show ring list view with custom message. 
			this.ringListView.updateInstr(data.message);
			this._showView(this.ringListView);
			
			// Update flag and backdrop
			this.isAuthorised = false;
			this._updateBackdrop();
			
			// Reset page title
			document.title = "Corner Judge";
		},

		_onJPConnectionStateChanged: function(connected) {
			console.log("Jury president " + (connected ? "connected" : "disconnected"));
			this.isJPConnected = connected;
			this._updateBackdrop();
		},

		_onScoringStateChanged: function(enabled) {
			console.log("Scoring " + (enabled ? "enabled" : "disabled"));
			this.isScoringEnabled = enabled;
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
