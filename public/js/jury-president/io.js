
/**
 * Jury President 'IO' module for socket communication.
 */
define(['minpubsub'], function (PubSub) {
	
	var socket;
	var events = [
		'waitingForId',
		'idSuccess',
		'idFail',
		'ringAllocations',
		'ringAllocationChanged',
		'ringCreated',
		'ringAlreadyExists',
		'newCornerJudge',
		'cornerJudgeStateChanged',
		'cornerJudgeScored',
		'restoreSession'
	];

	function init() {
		console.log("Connecting to server");
		socket = io.connect();

		// Bind events
		events.forEach(function (evt) {
			socket.on(evt, _publish.bind(this, evt));
		});
	}

	function _publish(subTopic) {
		PubSub.publish('io.' + subTopic, [].slice.call(arguments, 1));
	}

	function sendId(pwd) {
		socket.emit('juryPresident', pwd);
	}

	function createRing(index) {
		socket.emit('createRing', index);
	}
	
	function ringIsFull(cornerJudgeId) {
		socket.emit('ringIsFull', cornerJudgeId);
	}
	
	function matchInProgress(cornerJudgeId) {
		socket.emit('matchInProgress', cornerJudgeId);
	}

	function authoriseCornerJudge(id) {
		socket.emit('authoriseCornerJudge', id);
	}
	
	function rejectCornerJudge(id) {
		socket.emit('rejectCornerJudge', id);
	}
	
	function removeCornerJudge(id) {
		socket.emit('removeCornerJudge', id);
	}

	function sessionRestored() {
		socket.emit('sessionRestored');
	}
	
	function enableScoring(enable) {
		console.log((enable ? "Enable" : "Disable") + " scoring");
		socket.emit('enableScoring', enable);
	}

	return {
		init: init,
		sendId: sendId,
		createRing: createRing,
		ringIsFull: ringIsFull,
		matchInProgress: matchInProgress,
		authoriseCornerJudge: authoriseCornerJudge,
		rejectCornerJudge: rejectCornerJudge,
		removeCornerJudge: removeCornerJudge,
		sessionRestored: sessionRestored,
		enableScoring: enableScoring
	};
	
});
