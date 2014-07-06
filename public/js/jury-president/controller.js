
define([
	'minpubsub',
	'../common/helpers',
	'./io', './view/pwd-view',
	'../common/ring-list-view',
	'./model/ring',
	'./view/ring-view',
	'./controller/ring-controller'

], function (PubSub, Helpers, IO, PwdView, RingListView, Ring, RingView, RingController) {
	
	var pwdView, ringListView;
	
	var events = {
		io: {
			waitingForId: _onWaitingForId,
			idSuccess: _onIdSuccess,
			idFail: _onIdFail,
			ringAllocations: _onRingAllocations,
			ringAllocationChanged: _onRingAllocationChanged,
			ringCreated: _onRingCreated,
			ringAlreadyExists: _onRingAlreadyExists
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
		setTimeout(function () {
			IO.sendId('tkd')
		}, 200);
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
	
	function _onRingAllocations(rings) {
		console.log("Ring allocations received (rings=\"" + rings + "\")");
		ringListView.init(rings);
		_swapView(pwdView, ringListView);
	}
	
	function _onRingAllocationChanged(ring) {
		console.log("Ring allocation changed (ring=\"" + ring + "\")");
		ringListView.updateRingBtn(ring.index - 1, !ring.allocated);
	}
	
	function _onRingSelected(index) {
		console.log("Creating ring (index=" + index + ")");
		IO.createRing(index);
	}
	
	function _onRingCreated(index) {
		console.log("Ring created (index=" + index + ")");
		
		// Initialise ring model, view and controller
		var ring = new Ring(index);
		var ringView = new RingView(ring);
		var ringController = new RingController(ring, ringView);
		
		_swapView(ringListView, ringView);
	}
	
	function _onRingAlreadyExists(index) {
		console.error("Ring already exists (index=" + index + ")");
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
