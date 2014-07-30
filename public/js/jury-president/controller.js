
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./defaults',
	'./widget/pwd-view',
	'../common/ring-list-view',
	'./model/ring',
	'./widget/ring-view'

], function (PubSub, Helpers, IO, defaults, PwdView, RingListView, Ring, RingView) {
	
	// TODO: manage errors (subscribe to error event)
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Initialise views
		this.pwdView = new PwdView();
		this.ringListView = new RingListView();
		this.ringView = null;
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				waitingForId: this._onWaitingForId,
				idSuccess: this._onIdSuccess,
				idFail: this._onIdFail,
				ringAllocations: this._onRingAllocations,
				ringAllocationChanged: this._onRingAllocationChanged,
				ringCreated: this._onRingCreated,
				ringAlreadyExists: this._onRingAlreadyExists,
				restoreSession: this._onRestoreSession
			},
			pwdView: {
				pwdSubmitted: this._onPwdSubmitted
			},
			ringListView: {
				ringSelected: this._onRingSelected
			}
		});
	}
	
	Controller.prototype = {
	
		_swapView: function(oldView, newView) {
			newView.root.classList.remove('hidden');
			if (oldView) {
				oldView.root.classList.add('hidden');
			}
		},
		
		_onWaitingForId: function () {
			console.log("Server waiting for identification");
			this._swapView(null, this.pwdView);
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

		_onRingAllocations: function(allocations) {
			console.log("Ring allocations received (count=\"" + allocations.length + "\")");
			this.ringListView.init(allocations);
			this._swapView(this.pwdView, this.ringListView);
		},

		_onRingAllocationChanged: function(allocation) {
			console.log("Ring allocation changed (index=\"" + allocation.index + "\")");
			this.ringListView.updateRingBtn(allocation.index - 1, !allocation.allocated);
		},

		_onRingSelected: function(index) {
			console.log("Creating ring (index=" + index + ")");
			IO.createRing(index);
		},

		_initRing: function(index) {
			// Initialise ring model, view and controller
			var ring = new Ring(index, defaults.judgesPerRing);
			this.ringView = new RingView(ring);
			
			// Update page title to show ring number
			document.title = "Jury President | Ring " + (index + 1);
		},

		_onRingCreated: function(index) {
			console.log("Ring initialised (index=" + index + ")");
			this._initRing(index, defaults.judgesPerRing);
			this._swapView(this.ringListView, this.ringView);
		},

		_onRingAlreadyExists: function(index) {
			console.error("Ring already exists (index=" + index + ")");
		},

		_onRestoreSession: function(data) {
			console.log("Restoring session");

			// Init ring list view with ring allocation data
			this.ringListView.init(data.ringAllocations);

			// If no ring was created, show ring list view
			if (data.ringIndex === -1) {
				this._swapView(null, this.ringListView);

			// If a ring was created, initialise it then add corner judges and show authorisation view
			} else {
				this._initRing(data.ringIndex);

				for (var i = 0, len = data.cornerJudges.length; i < len; i += 1) {
					var judge = data.cornerJudges[i];
					this.ringView.ring.newJudge(judge.id, judge.name, judge.authorised, judge.connected);
				}

				this._swapView(null, this.ringView);
			}

			IO.sessionRestored();
		}
		
	};
	
	return Controller;
	
});
