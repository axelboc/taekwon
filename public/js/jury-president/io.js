
/**
 * Jury President 'IO' module for socket communication.
 */
define(['./view', 'enum/ui-views'], function (View, UIViews) {
	
	var socket;

	var init = function () {
		console.log("Connecting to server");
		socket = io.connect();

		// Bind events
		socket.on('waitingForId', onWaitingForId);
		socket.on('idSuccess', onIdSuccess);
		socket.on('idFail', onIdFail);
		socket.on('ringAllocations', onRingAllocations);
		socket.on('ringAllocationChanged', onRingAllocationChanged);
		socket.on('ringCreated', onRingCreated);
		socket.on('ringAlreadyExists', onRingAlreadyExists);
		socket.on('authoriseCornerJudge', onAuthoriseCornerJudge);
		socket.on('cornerJudgeStateChanged', onCornerJudgeStateChanged);
		socket.on('cornerJudgeScored', onCornerJudgeScored);
	};


	var onWaitingForId = function () {
		console.log("Server waiting for identification");
		View.onWaitingForId();
	};

	var sendId = function (password) {
		console.log("Sending identification (password=\"" + password + "\")");
		socket.emit('juryPresident', password);
	};

	var onIdSuccess = function (showRingsView) {
		console.log("Identification succeeded");
		View.pwdResult(true);

		// If in process of restoring session, rings view may need to be skipped
		if (showRingsView) {
			View.showElem(UIViews.RINGS, 'views');
		}
	};

	var onIdFail = function () {
		console.log("Identification failed");
		View.pwdResult(false);
	};

	var onRingAllocations = function (allocations) {
		console.log("Ring allocations: " + allocations);
		View.onRingAllocations(allocations);
	};

	var onRingAllocationChanged = function (allocation) {
		console.log("Ring allocation changed (allocation=\"" + allocation + "\")");
		View.onRingAllocationChanged(allocation, allocation.index - 1);
	};

	var createRing = function (index) {
		console.log("Creating ring (index=" + index + ")");
		socket.emit('createRing', index);
	};

	var onRingCreated = function (ringId) {
		console.log("Ring created (id=" + ringId + ")");
		View.showElem(UIViews.MATCH, 'views');
	};

	var onRingAlreadyExists = function (ringId) {
		console.log("Ring already exists (id=" + ringId + ")");
	};

	var onAuthoriseCornerJudge = function (cornerJudge) {
		console.log("Authorising corner judge (id=" + cornerJudge.id + ")");
		View.onAuthoriseCornerJudge(cornerJudge, false);
	};

	var authoriseCornerJudge = function (cornerJudgeId, authorise) {
		if (authorise) {
			console.log("Corner judge accepted (id=" + cornerJudgeId + ")");
			socket.emit('cornerJudgeAccepted', cornerJudgeId);
		} else {
			console.log("Corner judge rejected (id=" + cornerJudgeId + ")");
			socket.emit('cornerJudgeRejected', cornerJudgeId);
		}
	};

	var onCornerJudgeStateChanged = function (cornerJudge) {
		console.log("Corner judge " + (cornerJudge.connected ? "connected" : "disconnected") + " (id=" + cornerJudge.id + ")");
		View.onCornerJudgeStateChanged(cornerJudge);
	};

	var enableScoring = function (enable) {
		console.log((enable ? "Enable" : "Disable") + " scoring");
		socket.emit('enableScoring', enable);
	};
	
	var onCornerJudgeScored = function (score) {
		View.onCornerJudgeScored(score);
	};


	return {
		init: init,
		sendId: sendId,
		createRing: createRing,
		authoriseCornerJudge: authoriseCornerJudge,
		enableScoring: enableScoring,
		debug: function () {
			// DEBUG
			['Axel', 'Mikey', 'Chris'].forEach(function (name, index) {
				onCornerJudgeStateChanged({
					connected: true,
					id: index,
					name: name
				});
			});
		}
	};
	
});
