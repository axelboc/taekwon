
/**
 * Jury President 'IO' module for socket communication.
 */
define([
	'minpubsub',
	'../common/config'

], function (PubSub, config) {
	
	var primus;
	var events = [
		'wsError',
		'identify',
		'idSuccess',
		'idFail',
		'confirmIdentity',
		'ringStates',
		'ringStateChanged',
		'ringOpened',
		'slotAdded',
		'slotRemoved',
		'cjAdded',
		'cjRemoved',
		'cjAuthorised',
		'cjScored',
		'cjConnectionStateChanged',
		'cjExited',
		'restoreSession'
	];
	
	function init() {
		console.log("Connecting to server");
		primus = new Primus(config.isProd ? config.prodUrl : config.devUrl, {
			strategy: ['online', 'disconnect']
		});
		
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
			console.error('Error:', err.reason);
			
			// Reason: "Can't connect to server"
			// => Session cookie not transmitted
			if (err.code === 1002) {
				PubSub.publish('io.wsError', [{
					reason: "Enable cookies and try again"
				}]);
			}
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

	function sendId(pwd) {
		primus.emit('identification', {
			identity: 'juryPresident',
			password: pwd
		});
	}
	
	function sendIdentityConfirmation() {
		primus.emit('identityConfirmation', {
			identity: 'juryPresident'
		});
	}

	function openRing(index) {
		primus.emit('openRing', {
			index: index
		});
	}

	function authoriseCJ(id) {
		primus.emit('authoriseCJ', {
			id: id
		});
	}
	
	function rejectCJ(id, message) {
		primus.emit('rejectCJ', {
			id: id,
			message: message
		});
	}
	
	function removeCJ(id) {
		primus.emit('removeCJ', {
			id: id
		});
	}

	function sessionRestored() {
		primus.emit('sessionRestored');
	}
	
	function enableScoring(enable) {
		console.log((enable ? "Enable" : "Disable") + " scoring");
		primus.emit('enableScoring', {
			enable: enable
		});
	}
	
	function addSlot() {
		primus.emit('addSlot');
	}
	
	function removeSlot() {
		primus.emit('removeSlot');
	}

	return {
		init: init,
		sendId: sendId,
		sendIdentityConfirmation: sendIdentityConfirmation,
		openRing: openRing,
		authoriseCJ: authoriseCJ,
		rejectCJ: rejectCJ,
		removeCJ: removeCJ,
		sessionRestored: sessionRestored,
		enableScoring: enableScoring,
		addSlot: addSlot,
		removeSlot: removeSlot
	};
	
});
