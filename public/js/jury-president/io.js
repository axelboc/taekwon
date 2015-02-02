
/**
 * Jury President 'IO' module for socket communication.
 */
define([
	'minpubsub',
	'../common/config'

], function (PubSub, config) {
	
	var primus;
	var events = [
		'identify',
		'idSuccess',
		'idFail',
		'confirmIdentity',
		'ringStateChanged',
		'ringOpened',
		'slotNotRemoved',
		'cjAdded',
		'cjRemoved',
		'cjAuthorised',
		'matchCreated',
		'matchEnded',
		'cjScored',
		'cjUndid',
		'cjConnectionStateChanged',
		'cjExited',
		'wsError',
		'ringListView.ringList',
		'configPanel.config',
		'judgesSidebar.slotList',
		'matchPanel.scores', 'matchPanel.penalties'
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
			console.log(data);
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
		console.log("Sending identification (pwd=\"" + pwd + "\")");
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
	
	function addSlot() {
		primus.emit('addSlot');
	}
	
	function removeSlot() {
		primus.emit('removeSlot');
	}

	function authoriseCJ(id) {
		primus.emit('authoriseCJ', {
			id: id
		});
	}
	
	function rejectCJ(id) {
		primus.emit('rejectCJ', {
			id: id
		});
	}
	
	function removeCJ(id) {
		primus.emit('removeCJ', {
			id: id
		});
	}
	
	function setConfigItem(name, value) {
		console.log(name, value);
		primus.emit('setConfigItem', {
			name: name,
			value: value
		});
	}
	
	function createMatch() {
		primus.emit('createMatch');
	}
	
	function endMatch() {
		primus.emit('endMatch');
	}
	
	function enableScoring(enable) {
		console.log((enable ? "Enable" : "Disable") + " scoring");
		primus.emit('enableScoring', {
			enable: enable
		});
	}
	
	function startMatchState() {
		primus.emit('startMatchState');
	}
	
	function endMatchState() {
		primus.emit('endMatchState');
	}
	
	function startEndInjury() {
		primus.emit('startEndInjury');
	}
	
	function incrementPenalty(type, competitor) {
		primus.emit('incrementPenalty', {
			type: type,
			competitor: competitor
		});
	}
	
	function decrementPenalty(type, competitor) {
		primus.emit('decrementPenalty', {
			type: type,
			competitor: competitor
		});
	}

	return {
		init: init,
		sendId: sendId,
		sendIdentityConfirmation: sendIdentityConfirmation,
		openRing: openRing,
		addSlot: addSlot,
		removeSlot: removeSlot,
		authoriseCJ: authoriseCJ,
		rejectCJ: rejectCJ,
		removeCJ: removeCJ,
		setConfigItem: setConfigItem,
		createMatch: createMatch,
		endMatch: endMatch,
		enableScoring: enableScoring,
		startMatchState: startMatchState,
		endMatchState: endMatchState,
		startEndInjury: startEndInjury,
		incrementPenalty: incrementPenalty,
		decrementPenalty: decrementPenalty
	};
	
});
