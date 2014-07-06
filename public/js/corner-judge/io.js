
/**
 * Corner Judge 'IO' module for socket communication.
 */
define(['minpubsub'], function (PubSub) {
		
	var socket;
	var events = [
		'waitingForId',
		'idSuccess',
		'ringAllocations',
		'ringAllocationChanged',
		'ringJoined',
		'ringNotJoined',
		'ringDoesNotExist',
		'ringIsFull',
		'juryPresidentStateChanged',
		'scoringStateChanged',
		'removedFromRing'
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

	function sendId(name) {
		socket.emit('cornerJudge', name);
	};

	function joinRing(index) {
		socket.emit('joinRing', index);
	};

	function score(competitor, points) {
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
