
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
		'cornerJudgeScored'
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

	function authoriseCornerJudge(id) {
		socket.emit('authoriseCornerJudge', id);
	}
	
	function rejectCornerJudge(id) {
		socket.emit('rejectCornerJudge', id);
	}
	
	function removeCornerJudge(id) {
		socket.emit('removeCornerJudge', id);
	}

		
	/*
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
	};*/


	return {
		init: init,
		sendId: sendId,
		createRing: createRing,
		ringIsFull: ringIsFull,
		authoriseCornerJudge: authoriseCornerJudge,
		rejectCornerJudge: rejectCornerJudge,
		removeCornerJudge: removeCornerJudge
		/*enableScoring: enableScoring,
		debug: function () {
			// DEBUG
			['Axel', 'Mikey', 'Chris'].forEach(function (name, index) {
				onCornerJudgeStateChanged({
					connected: true,
					id: index,
					name: name
				});
			});
		}*/
	};
	
});
