
/**
 * Corner Judge 'IO' module for socket communication.
 */
define([
	'minpubsub',
	'../common/config'

], function (PubSub, config) {
		
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
		'matchInProgress',
		'juryPresidentStateChanged',
		'scoringStateChanged',
		'removedFromRing',
		'restoreSession'
	];

	function init() {
		console.log("Connecting to server");
		socket = io.connect(config.isProd ? config.prodUrl : config.devUrl, {
			path: '/socket.io'
		});
		
		// If server is disconnected, reload the page to show error (workaround for heartbeat reconnections)
		socket.on('disconnect', function () {
			window.location.reload();
		});
		
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
	}

	function joinRing(index) {
		socket.emit('joinRing', index);
	}

	function score(competitor, points) {
		socket.emit('score', {
			competitor: competitor,
			points: points
		});
	}

	function sessionRestored() {
		socket.emit('sessionRestored');
	}


	return {
		init: init,
		sendId: sendId,
		joinRing: joinRing,
		score: score,
		sessionRestored: sessionRestored
	};
	
});
