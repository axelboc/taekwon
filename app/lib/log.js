
// Modules
var assert = require('assert');
var Logger = require('nedb-logger');


/**
 * Log levels.
 * @type {Object}
 */
var LOG_LEVELS = {
	ERROR: 'error',
	INFO: 'info',
	DEBUG: 'debug'
};

/*
 * NeDB logger.
 * @type {Logger}
 */
var nedbLogger = new Logger({
	filename: 'data/logs.db'
});

/**
 * Console logging function for each log level.
 * @type {Object} 
 */
var consoleFuncs = {};
consoleFuncs[LOG_LEVELS.ERROR] = console.error;
consoleFuncs[LOG_LEVELS.INFO] = console.info;
consoleFuncs[LOG_LEVELS.DEBUG] = console.log;


/**
 * Add a new entry to the log file.
 * In development, the message is printed to the console.
 * @param {String} topic - (e.g. 'ring', 'match', etc.)
 * @param {String} level - (error|info|debug)
 * @param {String} message
 * @param {Object} data - optional data to store with the log entry
 */
function log(topic, level, message, data) {
	assert(typeof message === 'string', 'message');
	assert(typeof data === 'undefined' || typeof data === 'object', 
		   "if `data` is provided, it must be an object");
	
	// When in development, print debug and error messages to the console 
	if (process.env.NODE_ENV === 'development') {
		consoleFuncs[level]('[' + topic + '] ' + message);
	}

	// Add a new entry to the logs
	nedbLogger.insert({
		timestamp: new Date(),
		topic: topic,
		level: level,
		message: message,
		data: data
	}, function (err) {
		if (err && process.env.NODE_ENV === 'development') {
			consoleFuncs[LOG_LEVELS.ERROR]("Error adding log to NeDB datastore" + 
										   err.message ? ": " + err.message : "");
		}
	});
	
}

/**
 * Create a logger for a specific topic.
 * @param {String} topic - (e.g. 'ring', 'match', etc.)
 */
function logger(topic) {
	// Using Node's `assert` function
	// Environment variables (i.e. NODE_ENV) haven't been initialised at this stage
	assert(typeof topic === 'string' && topic.length > 0, "`topic` must be a non-empty string");
	
	return {
		
		/**
		 * Log operational errors (network, socket, database, user input, etc.)
		 * @param {String} message
		 * @param {Object} data
		 */
		error: log.bind(null, topic, LOG_LEVELS.ERROR),
		
		/**
		 * Log notable app events (ring opened, corner judge authorised, match ended, etc.)
		 * To faciliate log analysis, use a simple camel-case keyword - e.g. 'newUser', 'authorised'
		 * If the logger's topic is the subject of the event, do not repeat it in the keyword.
		 * For instance, if 'ring' is the topic, use 'opened' instead of 'ringOpened'.
		 * @param {String} message
		 * @param {Object} data
		 */
		info: log.bind(null, topic, LOG_LEVELS.INFO),
		
		/**
		 * Log debug messages and data.
		 * @param {String} message
		 * @param {Object} data
		 */
		debug: log.bind(null, topic, LOG_LEVELS.DEBUG)
		
	};
}

// Export the logger factory function
module.exports = logger;
