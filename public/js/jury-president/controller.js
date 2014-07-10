
define([
	'minpubsub',
	'../common/helpers',
	'./io', './view/pwd-view',
	'../common/ring-list-view',
	'./model/ring',
	'./view/ring-view',
	'./controller/ring-controller'

], function (PubSub, Helpers, IO, PwdView, RingListView, Ring, RingView, RingController) {
	
	var pwdView, ringListView, ringController, ringView;
	
	var events = {
		io: {
			waitingForId: _onWaitingForId,
			idSuccess: _onIdSuccess,
			idFail: _onIdFail,
			ringAllocations: _onRingAllocations,
			ringAllocationChanged: _onRingAllocationChanged,
			ringCreated: _onRingCreated,
			ringAlreadyExists: _onRingAlreadyExists,
			restoreSession: _onRestoreSession
		},
		pwdView: {
			pwdSubmitted: _onPwdSubmitted
		},
		ringListView: {
			ringSelected: _onRingSelected
		}
	};
	
	
	function init() {
		// Initialise socket connection with server
		IO.init();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, events);
		
		// Initialise views
		pwdView = new PwdView();
		ringListView = new RingListView();
		
		// DEBUG
		//IO.debug();
		/*setTimeout(function () {
			IO.sendId('tkd')
		}, 200);*/
	}
	
	function _onWaitingForId() {
		console.log("Server waiting for identification");
		// Initialise and show password view
		_swapView(null, pwdView);
		pwdView.init();
	}
	
	function _onPwdSubmitted(pwd) {
		console.log("Sending identification (pwd=\"" + pwd + "\")");
		IO.sendId(pwd);
	}
	
	function _onIdSuccess() {
		console.log("Identification succeeded");
	}
	
	function _onIdFail() {
		console.log("Identification failed");
		pwdView.invalidPwd();
	}
	
	function _onRingAllocations(allocations) {
		console.log("Ring allocations received (count=\"" + allocations.length + "\")");
		ringListView.init(allocations);
		_swapView(pwdView, ringListView);
	}
	
	function _onRingAllocationChanged(allocation) {
		console.log("Ring allocation changed (index=\"" + allocation.index + "\")");
		ringListView.updateRingBtn(allocation.index - 1, !allocation.allocated);
	}
	
	function _onRingSelected(index) {
		console.log("Creating ring (index=" + index + ")");
		IO.createRing(index);
	}
	
	function _createRing(index) {
		// Initialise ring model, view and controller
		var ring = new Ring(index);
		ringView = new RingView(ring);
		ringController = new RingController(ring, ringView);
	}
	
	function _onRingCreated(index) {
		console.log("Ring created (index=" + index + ")");
		_createRing(index);
		_swapView(ringListView, ringView);
	}
	
	function _onRingAlreadyExists(index) {
		console.error("Ring already exists (index=" + index + ")");
	}
	
	function _onRestoreSession(data) {
		console.log("Restoring session");
		
		// Init ring list view with ring allocation data
		ringListView.init(data.ringAllocations);
		
		// If no ring was created, show ring list view
		if (data.ringIndex === -1) {
			_swapView(null, ringListView);
			
		// If a ring was created, add corner judges and show authorisation view
		} else {
			_createRing(data.ringIndex);
			
			for (var i = 0, len = data.cornerJudges.length; i < len; i += 1) {
				var judge = data.cornerJudges[i];
				ringController.attachJudgeToSlot(i, judge.id, judge.name, judge.authorised, judge.connected);
			}
			
			_swapView(null, ringView);
		}
		
		IO.sessionRestored();
	}
	
	function _swapView(oldView, newView) {
		newView.root.classList.remove('hidden');
		if (oldView) {
			oldView.root.classList.add('hidden');
		}
	}
	
	return {
		init: init
	};
	
});
