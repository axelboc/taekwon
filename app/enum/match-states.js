
/**
 * Match states enum.
 * Includes regular expressions to test states.
 * @type {Object}
 */
module.exports = {
	MATCH_IDLE: 'match-idle',
	MATCH_ENDED: 'match-ended',
	ROUND_IDLE: 'round-idle',
	ROUND_STARTED: 'round-started',
	ROUND_ENDED: 'round-ended',
	BREAK_IDLE: 'break-idle',
	BREAK_STARTED: 'break-started',
	BREAK_ENDED: 'break-ended',
	INJURY: 'injury',
	RESULTS: 'results',
	
	BREAK_REGEX: /^break-.*$/,
	STARTED_REGEX: /^.*-started$/
};
