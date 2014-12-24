
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./defaults',
	'../common/ws-error-view',
	'./widget/pwd-view',
	'../common/ring-list-view',
	'./model/ring',
	'./widget/ring-view',
	'../common/backdrop'

], function (PubSub, Helpers, IO, defaults, WsErrorView, PwdView, RingListView, Ring, RingView, Backdrop) {
	
	// TODO: manage errors (subscribe to error event)
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				wsError: this._onWsError,
				identify: this._onIdentify,
				idSuccess: this._onIdSuccess,
				idFail: this._onIdFail,
				confirmIdentity: this._onConfirmIdentity,
				ringStates: this._onRingStates,
				ringStateChanged: this._onRingStateChanged,
				ringOpened: this._onRingOpened,
				restoreSession: this._onRestoreSession
			},
			pwdView: {
				pwdSubmitted: this._onPwdSubmitted
			},
			ringListView: {
				ringSelected: this._onRingSelected
			}
		});
		
		// Initialise views
		this.currentView = null;
		this.wsErrorView = new WsErrorView();
		this.pwdView = new PwdView();
		this.ringListView = new RingListView();
		this.ringView = null;
		
		// Initialise backdrop
		this.backdrop = new Backdrop();
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
		
		_onIdentify: function () {
			console.log("Server waiting for identification");
			this._showView(this.pwdView);
			this.pwdView.init();
		},
	
		_onPwdSubmitted: function(pwd) {
			console.log("Sending identification (pwd=\"" + pwd + "\")");
			IO.sendId(pwd);
		},

		_onIdSuccess: function() {
			console.log("Identification succeeded");
		},

		_onIdFail: function() {
			console.log("Identification failed");
			this.pwdView.invalidPwd();
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

		_onRingSelected: function(index) {
			console.log("Opening ring (index=" + index + ")");
			IO.openRing(index);
		},

		_initRing: function(index) {
			// Initialise ring model, view and controller
			var ring = new Ring(index, defaults.judgesPerRing);
			this.ringView = new RingView(ring);
			
			// Update page title to show ring number
			document.title = "Jury President | Ring " + (index + 1);
		},

		_onRingOpened: function(data) {
			console.log("Ring opened (index=" + data.index + ")");
			this._initRing(data.index);
			this._showView(this.ringView);
		},

		_onRingAlreadyOpen: function(index) {
			console.error("Ring already open (index=" + index + ")");
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
				this._initRing(data.ringIndex);

				for (var i = 0, len = data.cornerJudges.length; i < len; i += 1) {
					var judge = data.cornerJudges[i];
					this.ringView.ring.newJudge(judge.id, judge.name, judge.authorised, judge.connected);
				}

				this._showView(this.ringView);
				IO.enableScoring(false);				
			}

			IO.sessionRestored();
		}
		
	};
	
	return Controller;
	
});
