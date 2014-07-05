
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
		'authoriseCornerJudge',
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
	};

	function createRing(index) {
		socket.emit('createRing', index);
	};

		
		
	/*var onAuthoriseCornerJudge = function (cornerJudge) {
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
	};*/


	return {
		init: init,
		sendId: sendId,
		createRing: createRing/*,
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
		}*/
	};
	
});
