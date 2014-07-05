
define(['minpubsub', './io', './view/pwd-view', './view/ring-list-view', './view/ring-view'], function (PubSub, IO, PwdView, RingListView, RingView) {
	
	var pwdView, ringsView;
	
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
		},
		ringView: {
			
		}
	};
	
	
	function init() {
		// Initialise socket connection with server
		IO.init();
		
		// Subscribe to events
		Object.keys(events).forEach(function (topic) {
			var topicEvents = events[topic];
			Object.keys(topicEvents).forEach(function (subTopic) {
				PubSub.subscribe(topic + '.' + subTopic, topicEvents[subTopic]);
			});
		}, this);
		
		// Initialise views
		pwdView = new PwdView();
		ringListView = new RingListView();
		ringView = new RingView();
		
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
	
	function _onRingCreated(id) {
		console.log("Ring created (id=" + id + ")");
		_swapView(ringListView, ringView);
	}
	
	function _onRingAlreadyExists(id) {
		console.error("Ring already exists (id=" + id + ")");
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
