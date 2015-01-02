
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'../common/ws-error-view',
	'./widget/pwd-view',
	'../common/ring-list-view',
	'./model/ring',
	'./widget/ring-view',
	'../common/backdrop'

], function (PubSub, Helpers, IO, WsErrorView, PwdView, RingListView, Ring, RingView, Backdrop) {
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Initialise views
		this.currentView = null;
		this.wsErrorView = new WsErrorView();
		this.pwdView = new PwdView();
		this.ringListView = new RingListView();
		this.ringView = new RingView();
		
		// Initialise backdrop
		this.backdrop = new Backdrop();
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				wsError: this._onWsError,
				identify: this._showView.bind(this, this.pwdView),
				confirmIdentity: this._onConfirmIdentity,
				ringStates: this._onRingStates,
				ringStateChanged: this._onRingStateChanged,
				ringOpened: this._onRingOpened,
				restoreSession: this._onRestoreSession
			}
		});
	}
	
	Controller.prototype = {
	
		_showView: function(newView) {
			// Hide the previously visible view
			if (this.curentView) {
				this.curentView.root.classList.add('hidden');
			}
			
			// Show the new view
			newView.root.classList.remove('hidden');
			this.curentView = newView;
		},
		
		_onWsError: function (data) {
			console.log("Error:", data.reason);
			this.wsErrorView.updateInstr(data.reason);
			this._showView(this.wsErrorView);
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
			this.ringListView.updateRingBtn(state.index, !state.open);
		},

		_initRing: function(index, slotCount) {
			// Initialise ring model, view and controller
			var ring = new Ring(index, slotCount);
			this.ringView.setRing(ring);
			
			// Update page title to show ring number
			document.title = "Jury President | Ring " + (index + 1);
		},

		_onRingOpened: function(data) {
			console.log("Ring opened (index=" + data.index + ", slotCount=" + data.slotCount + ")");
			this._initRing(data.index, data.slotCount);
			this._showView(this.ringView);
		},

		_onRestoreSession: function(data) {
			console.log("Restoring session");

			// Init ring list view with ring state data
			this.ringListView.init(data.ringStates);

			// If no ring was created, show ring list view
			if (data.ringIndex === -1) {
				this._showView(this.ringListView);

			// If a ring was created, initialise it then add corner judges and show authorisation view
			} else {
				this._initRing(data.ringIndex, data.ringSlotCount);

				for (var i = 0, len = data.cornerJudges.length; i < len; i += 1) {
					var judge = data.cornerJudges[i];
					this.ringView.ring.addCJ(judge.id, judge.name, judge.authorised, judge.connected);
				}
				
				if (data.match) {
					// Initialise match
					this.ringView.initMatch();
				}

				this._showView(this.ringView);
				IO.enableScoring(false);				
			}

			IO.sessionRestored();
		}
		
	};
	
	return Controller;
	
});
