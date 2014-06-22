
/**
 * Match
 */
define(['match-config', 'enum/match-states'], function (config, MatchStates) {
	
	function Match () {
		this.init();
		
		this.lastState = this.states.length - 1;
		this.currentState = 0;
	}
	
	Match.prototype = {
		
		init: function () {
			/* Build match states array */ 
			var states = [MatchStates.START, MatchStates.ROUND_1];
			
			if (config.roundCount === 2) { states.push(MatchStates.BREAK, MatchStates.ROUND_2); }
			if (config.tieBreaker) { states.push(MatchStates.BREAK, MatchStates.TIE_BREAKER); }
			if (config.goldenPoint) { states.push(MatchStates.BREAK, MatchStates.GOLDEN_POINT); }
			
			states.push(MatchStates.END);
			this.states = states;
		}
		
	};
	
	return Match;
	
});
