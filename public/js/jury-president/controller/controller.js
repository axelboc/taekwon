
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../view/pwd-view',
	'../../common/ring-list-view',
	'../model/ring',
	'../view/ring-view',
	'./ring-controller'

], function (PubSub, Helpers, IO, PwdView, RingListView, Ring, RingView, RingController) {
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
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
		
		// Initialise views, panels and controllers
		this.pwdView = new PwdView();
		this.ringListView = new RingListView();
		this.ringController = null;
		this.ringView = null;
		this.configPanel = null;
		
		// DEBUG
		//IO.debug();
		/*setTimeout(function () {
			IO.sendId('tkd')
		}, 200);*/
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

		_createRing: function(index) {
			// Initialise ring model, view and controller
			var ring = new Ring(index);
			this.ringView = new RingView(ring);
			this.ringController = new RingController(ring, this.ringView);
		},

		_onRingCreated: function(index) {
			console.log("Ring created (index=" + index + ")");
			this._createRing(index);
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

			// If a ring was created, add corner judges and show authorisation view
			} else {
				this._createRing(data.ringIndex);

				for (var i = 0, len = data.cornerJudges.length; i < len; i += 1) {
					var judge = data.cornerJudges[i];
					this.ringController.attachJudgeToSlot(i, judge.id, judge.name, judge.authorised, judge.connected);
				}

				this._swapView(null, this.ringView);
			}

			IO.sessionRestored();
		}
		
	};
	
	return Controller;
	
});
