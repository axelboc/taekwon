
define(['minpubsub', './io', './view/name-view', '../common/ring-list-view', './view/round-view'], function (PubSub, IO, NameView, RingListView, RoundView) {
	
	var nameView, ringListView, authorisationView, roundView;
	var isScoringEnabled = false;
	var disconnectedBackdrop, waitingBackdrop;
	
	var events = {
		io: {
			waitingForId: _onWaitingForId,
			idSuccess: _onIdSuccess,
			ringAllocations: _onRingAllocations,
			ringAllocationChanged: _onRingAllocationChanged,
			ringJoined: _onRingJoined,
			ringNotJoined: _onRingNotJoined,
			ringDoesNotExist: _onRingDoesNotExist,
			ringIsFull: _onRingIsFull,
			juryPresidentStateChanged: _onJuryPresidentStateChanged,
			scoringStateChanged: _onScoringStateChanged
		},
		nameView: {
			nameSubmitted: _onNameSubmitted
		},
		ringListView: {
			ringSelected: _onRingSelected
		},
		roundView: {
			score: _onScore
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
		nameView = new NameView();
		ringListView = new RingListView();
		// Authorisation view doesn't need to be defined as a separate module
		authorisationView = {
			root: document.getElementById('authorisation-view')
		};
		roundView = new RoundView();
		
		disconnectedBackdrop = document.getElementById('disconnected-backdrop');
		waitingBackdrop = document.getElementById('waiting-backdrop');
	}
	
	function _onWaitingForId() {
		console.log("Server waiting for identification");
		// Initialise and show name view
		_swapView(null, nameView);
		nameView.init();
	}
	
	function _onNameSubmitted(name) {
		console.log("Sending identification (name=\"" + name + "\")");
		IO.sendId(name);
	}
	
	function _onIdSuccess() {
		console.log("Identification succeeded");
	}
	
	function _onRingAllocations(rings) {
		console.log("Ring allocations received (rings=\"" + rings + "\")");
		ringListView.init(rings);
		_swapView(nameView, ringListView);
	}
	
	function _onRingAllocationChanged(ring) {
		console.log("Ring allocation changed (ring=\"" + ring + "\")");
		ringListView.updateRingBtn(ring.index - 1, ring.allocated);
	}
	
	function _onRingSelected(index) {
		console.log("Joining ring (index=" + index + ")");
		IO.joinRing(index);
		console.log("Waiting for authorisation to join ring");
		_swapView(ringListView, authorisationView);
	}
	
	function _onRingJoined(index) {
		console.log("Joined ring (index=" + index + ")");
		_toggleBackdrop(true, waitingBackdrop);
		_swapView(authorisationView, roundView);
	}
	
	function _onRingNotJoined(index) {
		console.log("Ring not joined (index=" + index + ")");
		ringListView.updateInstr("Not authorised to join ring");
		_swapView(authorisationView, ringListView);
	}
	
	function _onRingDoesNotExist(index) {
		console.log("Ring does not exist (index=" + index + ")");
		ringListView.updateInstr("Sorry, an error occured");
		_swapView(authorisationView, ringListView);
	}
	
	function _onRingIsFull() {
		console.log("Ring is full (index=" + index + ")");
		ringListView.updateInstr("Ring is full");
		_swapView(authorisationView, ringListView);
	}
	
	function _onJuryPresidentStateChanged(connected) {
		console.log("Jury president " + (connected ? "connected" : "disconnected"));
		_toggleBackdrop(!connected, disconnectedBackdrop);
	}
	
	function _onScoringStateChanged(enabled) {
		console.log("Scoring " + (enabled ? "enabled" : "disabled"));
		isScoringEnabled = enabled;
		_toggleBackdrop(!enabled, waitingBackdrop);
	}
	
	function _onScore(competitor, points) {
		console.log("Scoring " + points + " points for " + competitor);
		IO.score(competitor, points);
	}
	
	function _swapView(oldView, newView) {
		newView.root.classList.remove('hidden');
		if (oldView) {
			oldView.root.classList.add('hidden');
		}
	}

	function _toggleBackdrop(show, backdrop) {
		var isDisconnectedBackdrop = backdrop === disconnectedBackdrop;
		if (!show && isDisconnectedBackdrop && !isScoringEnabled) {
			// Restore waiting backdrop instead
			show = true;
			backdrop = waitingBackdrop;
		}

		if (show && backdrop) {
			disconnectedBackdrop.classList.toggle('hidden', !isDisconnectedBackdrop);
			waitingBackdrop.classList.toggle('hidden', isDisconnectedBackdrop);
		}

		// Show/hide backdrop wrapper
		backdropWrap.classList.toggle('hidden', !show);
	}
	
	return {
		init: init
	};
	
});
