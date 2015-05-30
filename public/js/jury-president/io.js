
/**
 * Jury President 'IO' module for socket communication.
 */
define(function () {
	
	var primus;
	var events = [
		'matchStateChanged', 'matchResultsComputed', 'matchEnded',
		'matchPanel.state',
		'resultPanel.scoreboard'
	];

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
