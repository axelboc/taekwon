
/**
 * Corner Judge 'IO' module for socket communication.
 */
define([
	'minpubsub',
	'../common/config'

], function (PubSub, config) {
		
	var primus;
	var events = [
		'waitingForId',
		'idSuccess',
		'idFail',
		'confirmIdentity',
		'ringStates',
		'ringStateChanged',
		'waitingForAuthorisation',
		'ringJoined',
		'ringLeft',
		'jpStateChanged',
		'scoringStateChanged',
		'restoreSession'
	];

	function init() {
		console.log("Connecting to server");
		primus = new Primus(config.isProd ? config.prodUrl : config.devUrl, {});
		
		// Listen for opening of connection
		primus.on('open', function open() {
			console.log('Connection is alive and kicking');
		});
		
		// Listen for incoming data
		primus.on('data', function data(data) {
			PubSub.publish('io.' + data.event, data.value);
		});
		
		// Listen for errors
		primus.on('error', function error(err) {
			console.error('Something horrible has happened', err.stack);
		});
		
		// Listen for when Primus attempts to reconnect
		primus.on('reconnect', function reconnect() {
			console.log('Reconnect attempt started');
		});
		
		// Listen for when Primus plans on reconnecting
		primus.on('reconnecting', function reconnecting(opts) {
			console.log('Reconnecting in %d ms', opts.timeout);
			console.log('This is attempt %d out of %d', opts.attempt, opts.retries);
		});
		
		// Listen for timeouts
		primus.on('timeout', function timeout(msg) {
			console.log('Timeout!', msg);
		});
		
		// Listen for closing of connection
		primus.on('end', function end() {
			console.log('Connection closed');
		});
		
		// Regained network connection
		primus.on('online', function online(msg) {
			console.log('Online!', msg);
		});
		
		// Lost network connection
		primus.on('offline', function offline(msg) {
			console.log('Offline!', msg);
		});
		
		// Bind events
		events.forEach(function (evt) {
			primus.on(evt, _publish.bind(this, evt));
		});
	}

	function _publish(subTopic) {
		PubSub.publish('io.' + subTopic, [].slice.call(arguments, 1));
	}

	function sendId(name) {
		primus.emit('cornerJudge', name);
	}
	
	function sendIdentityConfirmation() {
		primus.emit('identityConfirmation', 'cornerJudge');
	}

	function joinRing(index) {
		primus.emit('joinRing', index);
	}

	function score(competitor, points) {
		primus.emit('score', {
			competitor: competitor,
			points: points
		});
	}

	function sessionRestored() {
		primus.emit('sessionRestored');
	}


	return {
		init: init,
		sendId: sendId,
		sendIdentityConfirmation: sendIdentityConfirmation,
		joinRing: joinRing,
		score: score,
		sessionRestored: sessionRestored
	};
	
});
