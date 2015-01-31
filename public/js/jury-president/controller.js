
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
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Initialise views and backdrop
		this.currentView = null;
		this.pwdView = new PwdView();
		this.ringListView = new RingListView();
		this.ringView = new RingView();
		this.wsErrorView = new WsErrorView();
		this.backdrop = new Backdrop();
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				identify: this._showView.bind(this, this.pwdView),
				idSuccess: this._showView.bind(this, this.ringListView),
				confirmIdentity: IO.sendIdentityConfirmation,
				ringOpened: this._onRingOpened,
				restoreSession: this._onRestoreSession,
				wsError: this._showView.bind(this, this.wsErrorView)
			}
		});
	}
	
	Controller.prototype = {
	
		_showView: function(newView) {
			// Hide the previously visible view
			if (this.currentView) {
				this.currentView.root.classList.add('hidden');
			}
			
			// Show the new view
			newView.root.classList.remove('hidden');
			this.currentView = newView;
		},

		_updateTitle: function(ringIndex) {
			// Update page title to show ring number
			document.title = "Jury President | Ring " + (ringIndex + 1);
		},

		_onRingOpened: function(data) {
			console.log("Ring opened (index=" + data.index + ")");
			this._updateTitle(data.index);
			this._showView(this.ringView);
		},

		_onRestoreSession: function(data) {
			console.log("Restoring session");

			// TODO: Init ring list view with ring state data
			this.ringListView.init(data.ringStates);

			// If no ring was created, show ring list view
			if (data.ringIndex === -1) {
				this._showView(this.ringListView);

			// If a ring was created, initialise it then add corner judges and show authorisation view
			} else {
				this._updateTitle(data.ringIndex);

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
