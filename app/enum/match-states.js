
/**
 * Match states enum.
 * Includes regular expressions to test states.
 * @type {Object}
 */
module.exports = {
	MATCH_IDLE: 'matchidle',
	MATCH_ENDED: 'matchended',
	ROUND_IDLE: 'roundidle',
	ROUND_STARTED: 'roundstarted',
	ROUND_ENDED: 'roundended',
	BREAK_IDLE: 'breakidle',
	BREAK_STARTED: 'breakstarted',
	BREAK_ENDED: 'breakended',
	INJURY: 'injury',
	RESULTS: 'results',
	
	BREAK_REGEX: /^break.*$/,
	STARTED_REGEX: /^.*started$/
};
