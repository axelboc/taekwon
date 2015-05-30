
/**
 * Corner Judge 'IO' module for socket communication.
 */
define(function () {
		
	var primus;

	function sendId(name) {
		primus.emit('identification', {
			identity: 'cornerJudge',
			name: name
		});
	}
	
	function sendIdentityConfirmation() {
		primus.emit('identityConfirmation', {
			identity: 'cornerJudge'
		});
	}

	function joinRing(index) {
		console.log("Joining ring (index=" + index + ")");
		primus.emit('joinRing', {
			index: index
		});
	}

	function score(competitor, points) {
		console.log("Scoring " + points + " points for " + competitor);
		primus.emit('score', {
			competitor: competitor,
			points: points
		});
	}

	function undo() {
		console.log("Undoing score");
		primus.emit('undo');
	}


	return {
		init: init,
		sendId: sendId,
		sendIdentityConfirmation: sendIdentityConfirmation,
		joinRing: joinRing,
		score: score,
		undo: undo
	};
	
});
