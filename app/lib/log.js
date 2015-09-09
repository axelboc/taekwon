'use strict';

// Dependencies
var path = require('path');
var extend = require('extend');
var NeDBLogger = require('nedb-logger');


/**
 * Log directory path.
 * @type {String}
 */
var PATH = 'app/data/logs';

/**
 * Log levels.
 * @type {Object}
 */
var levels = {
	LOG: 'log',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
};

/**
 * NeDB logger.
 * @type {NeDBLogger}
 */
var nedbLogger = null;


module.exports = {
	
	/**
	 * Initialise the log module by creating an instance of NeDBLogger.
	 * Log files are named as follows: `<tournament-id>.db`.
	 * @param {String} tournamentId
	 */
	init: function (tournamentId) {
		nedbLogger = new NeDBLogger({
			filename: path.join(PATH, tournamentId + '.db')
		});
	},
	
	/**
	 * Create a new logger facade.
	 * @param {String} topic - used for categorisation purposes
	 * @param {String} name - a name that is printed to the console in development
	 * @param {Object} loggerData (optional) - data to attach to every log entry produced but the logger
	 * @return {Object} - a facade with a logging function for each log level
	 */
	createLogger: function (topic, name, loggerData) {
		
		/**
		 * The logger's main log function.
		 * @param {String} level
		 * @param {String} event
		 * @param {String} message (optional)
		 * @param {Object} data (optional)
		 */
		function log(level, event, message, data) {
			if (!nedbLogger) {
				throw new Error("log module not initialised");
			}
			
			// Allow skipping message argument
			if (!data && typeof message === 'object') {
				data = message;
				message = null;
			}

			// In development, log the message (or the event) to console
			if (process.env.NODE_ENV === 'development') {
				console[level]('[' + name + '] ' + event + (message ? ": " + message : ""));
			}
				
			// Persist log except when level is LOG
			if (level !== levels.LOG) {
				// Add a new entry to the logs
				nedbLogger.insert({
					timestamp: new Date(),
					level: level,
					topic: topic,
					event: event,
					data: extend({}, loggerData, data)
				}, function (err) {
					if (err) {
						console.error("Error adding log to NeDB datastore" + (err.message ? ": " + err.message : ""));
					}
				});
			}
		}
		
		return {
			
			/**
			 * Print a message to the console in development.
			 * @param {String} message
			 */
			debug: log.bind(null, levels.LOG),
			
			/**
			 * Log app events (ring opened, corner judge authorised, match ended, etc.)
			 * To faciliate log analysis, pass a simple camel-case keyword - e.g. 'newUser', 'authorised'
			 * If the logger's topic is the subject of the event, do not repeat it in the keyword.
			 * For instance, if 'ring' is the topic, use 'opened' instead of 'ringOpened'.
			 * @param {String} event
			 * @param {String} message (optional)
			 * @param {Object} data (optional)
			 */
			info: log.bind(null, levels.INFO),
			
			/**
			 * Log warnings (ring full, cannot remove slot, etc.)
			 * @param {String} event
			 * @param {String} message (optional)
			 * @param {Object} data (optional)
			 */
			warn: log.bind(null, levels.WARN),
			
			/**
			 * Log operational errors (network, socket, database, user input, etc.)
			 * @param {String} event
			 * @param {String} message (optional)
			 * @param {Object} data (optional)
			 */
			error: log.bind(null, levels.ERROR)
			
		};
	}
	
};
