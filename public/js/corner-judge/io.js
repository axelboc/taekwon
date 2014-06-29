
/**
 * Corner Judge 'IO' module for socket communication.
 */
define(['./view', 'enum/ui-views', 'enum/ui-backdrops'], function (View, UIViews, UIBackdrops) {
		
	var socket;

	var init = function (name) {
		console.log("Connecting to server");
		socket = io.connect();

		// Bind events
		socket.on('waitingForId', onWaitingForId);
		socket.on('idSuccess', onIdSuccess);
		socket.on('ringAllocations', onRingAllocations);
		socket.on('ringAllocationChanged', onRingAllocationChanged);
		socket.on('waitingForAuthorisation', onWaitingForAuthorisation);
		socket.on('ringJoined', onRingJoined);
		socket.on('ringNotJoined', onRingNotJoined);
		socket.on('ringDoesNotExist', onRingDoesNotExist);
		socket.on('ringIsFull', onRingIsFull);
		socket.on('juryPresidentStateChanged', onJuryPresidentStateChanged);
		socket.on('scoringStateChanged', onScoringStateChanged);
	};


	var onWaitingForId = function () {
		console.log("Server waiting for identification");
		View.onWaitingForId();
	};

	var sendId = function (name) {
		console.log("Sending identification (name=\"" + name + "\")");
		socket.emit('cornerJudge', name);
	};

	var onIdSuccess = function (showRingsView) {
		console.log("Identification succeeded");

		// If in process of restoring session, rings view may need to be skipped
		if (showRingsView) {
			View.showView(UIViews.RINGS);
		}
	};

	var onRingAllocations = function (allocations) {
		console.log("Ring allocations: " + allocations);
		View.onRingAllocations(allocations);
	};

	var onRingAllocationChanged = function (allocation) {
		console.log("Ring allocation changed (allocation=\"" + allocation + "\")");
		View.onRingAllocationChanged(allocation, allocation.index - 1);
	};

	var onWaitingForAuthorisation = function () {
		console.log("Waiting for authorisation to join ring");
		View.showView(UIViews.AUTHORISATION);
	};

	var joinRing = function (ringId) {
		console.log("Joining ring (id=" + ringId + ")");
		socket.emit('joinRing', ringId);
		View.showView(UIViews.AUTHORISATION);
	};

	var onRingJoined = function (ringId) {
		console.log("Joined ring (id=" + ringId + ")");
		View.showView(UIViews.ROUND);
		View.toggleBackdrop(true, UIBackdrops.WAITING);
	};

	var onRingNotJoined = function (ringId) {
		console.log("Ring not joined (id=" + ringId + ")");
		View.ringNotJoined("Not authorised to join ring");
	};

	var onRingDoesNotExist = function (ringId) {
		console.log("Ring does not exist (id=" + ringId + ")");
		View.ringNotJoined("Ring does not exist... Wait, that's not quite right. Please contact the administrator.");
	};

	var onRingIsFull = function (ringId) {
		console.log("Ring is full (id=" + ringId + ")");
		View.ringNotJoined("Ring is full");
	};

	var onJuryPresidentStateChanged = function (connected) {
		console.log("Jury president " + (connected ? "connected" : "disconnected"));
		View.toggleBackdrop(!connected, UIBackdrops.DISCONNECTED);
	};

	var onScoringStateChanged = function (enabled) {
		console.log("Scoring " + (enabled ? "enabled" : "disabled"));
		View.onScoringStateChanged(enabled);
	};

	var score = function (competitor, points) {
		console.log("Scoring " + points + " points for " + competitor);
		socket.emit('score', {
			competitor: competitor,
			points: points
		});
	};


	return {
		init: init,
		sendId: sendId,
		joinRing: joinRing,
		score: score
	};
	
});
