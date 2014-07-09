
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./view/name-view',
	'../common/ring-list-view',
	'./view/round-view'

], function (PubSub, Helpers, IO, NameView, RingListView, RoundView) {
	
	var nameView, ringListView, authorisationView, roundView;
	var isScoringEnabled = false, isJPConnected = false;
	var backdropWrap, disconnectedBackdrop, waitingBackdrop;
	
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
			scoringStateChanged: _onScoringStateChanged,
			removedFromRing: _onRemovedFromRing,
			restoreSession: _onRestoreSession
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
		Helpers.subscribeToEvents(this, events);
		
		// Initialise views
		nameView = new NameView();
		ringListView = new RingListView();
		// Authorisation view doesn't need to be defined as a separate module
		authorisationView = {
			root: document.getElementById('authorisation')
		};
		roundView = new RoundView();
		
		backdropWrap = document.getElementById('backdrop-wrap');
		disconnectedBackdrop = document.getElementById('disconnected-backdrop');
		waitingBackdrop = document.getElementById('waiting-backdrop');
		
		// DEBUG
		/*setTimeout(function () {
			IO.sendId('Axel')
		}, 200);*/
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
	
	function _onRingAllocations(allocations) {
		console.log("Ring allocations received (count=\"" + allocations.length + "\")");
		ringListView.init(allocations);
		_swapView(nameView, ringListView);
	}
	
	function _onRingAllocationChanged(allocation) {
		console.log("Ring allocation changed (index=\"" + allocation.index + "\")");
		ringListView.updateRingBtn(allocation.index - 1, allocation.allocated);
	}
	
	function _onRingSelected(index) {
		console.log("Joining ring (index=" + index + ")");
		IO.joinRing(index);
		console.log("Waiting for authorisation to join ring");
		_swapView(ringListView, authorisationView);
	}
	
	function _onRingJoined(data) {
		console.log("Joined ring (index=" + data.ringIndex + ")");
		
		// Show round view
		_swapView(authorisationView, roundView);
		
		// Update scoring and JP states and toggle backdrops
		isScoringEnabled = data.scoringEnabled;
		isJPConnected = data.jpConnected;
		_updateBackdrops();
	}
	
	function _onRingNotJoined(index) {
		console.log("Ring not joined (index=" + index + ")");
		ringListView.updateInstr("Not authorised to join ring");
		_swapView(authorisationView, ringListView);
	}
	
	function _onRingDoesNotExist(index) {
		console.error("Ring does not exist (index=" + index + ")");
		ringListView.updateInstr("Sorry, an error occured");
		_swapView(authorisationView, ringListView);
	}
	
	function _onRingIsFull(index) {
		console.log("Ring is full (index=" + index + ")");
		ringListView.updateInstr("Ring is full");
		_swapView(authorisationView, ringListView);
	}
	
	function _onJuryPresidentStateChanged(connected) {
		console.log("Jury president " + (connected ? "connected" : "disconnected"));
		isJPConnected = connected;
		_updateBackdrops();
	}
	
	function _onScoringStateChanged(enabled) {
		console.log("Scoring " + (enabled ? "enabled" : "disabled"));
		isScoringEnabled = enabled;
		_updateBackdrops();
	}
	
	function _onScore(competitor, points) {
		console.log("Scoring " + points + " points for " + competitor);
		IO.score(competitor, points);
	}
	
	function _onRemovedFromRing(index) {
		console.log("Ring is full (index=" + index + ")");
		ringListView.updateInstr("Removed from ring");
		_swapView(roundView, ringListView);
		_updateBackdrops();
	}
	
	function _onRestoreSession(data) {
		console.log("Restoring session");
		console.log(data);
		
		// Init ring list view with ring allocation data
		ringListView.init(data.ringAllocations);
		
		// If no ring has been joined yet, show ring list view
		if (data.ringIndex === -1) {
			_swapView(null, ringListView);
			
		// If a ring has been joined, but JP hasn't authorised the request yet, show authorisation view
		} else if (!data.authorised) {
			_swapView(null, authorisationView);
		
		// If JP has authorised CJ to join a ring, show round view
		} else {
			_swapView(null, roundView);
			
			// Retrieve scoring and JP states and toggle backdrops
			isScoringEnabled = data.scoringEnabled;
			isJPConnected = data.jpConnected;
			_updateBackdrops();
		}
		
		IO.sessionRestored();
	}
	
	function _swapView(oldView, newView) {
		newView.root.classList.remove('hidden');
		if (oldView) {
			oldView.root.classList.add('hidden');
		}
	}

	function _updateBackdrops() {
		// Toggle backdrops
		disconnectedBackdrop.classList.toggle('hidden', isJPConnected);
		waitingBackdrop.classList.toggle('hidden', !isJPConnected || isScoringEnabled);
		
		// Toggle backdrop wrapper
		backdropWrap.classList.toggle('hidden', roundView.root.classList.contains('hidden') || 
									  			isJPConnected && (!isJPConnected || isScoringEnabled));
	}
	
	return {
		init: init
	};
	
});
