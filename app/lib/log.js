'use strict';

// Dependencies
var extend = require('extend');
var NeDBLogger = require('nedb-logger');


/**
 * NeDB logger.
 * @type {NeDBLogger}
 */
var nedbLogger = new NeDBLogger({
	filename: 'app/data/logs.db'
});


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


module.exports = {
	
	createLogger: function (topic, name, loggerData) {
		
		/**
		 * The logger's main log function.
		 * @param {String} level
		 * @param {String} event
		 * @param {String} message (optional)
		 * @param {Object} data (optional)
		 */
		function log(level, event, message, data) {
			// Allow skipping message argument
			if (!data && typeof message === 'object') {
				data = message;
				message = null;
			}

			// In development, log the message (or the event) to console
			if (process.env.NODE_ENV === 'development') {
				console[level]('[' + name + '] ' + event + (message ? ": " + message : ""));
				
				// If level is LOG, don't persist
				if (level === levels.LOG) {
					return;
				}
			}

			// Add a new entry to the logs
			nedbLogger.insert({
				timestamp: new Date(),
				level: level,
				topic: topic,
				event: event,
				data: extend({}, loggerData, data)
			}, function (err) {
				if (err && process.env.NODE_ENV === 'development') {
					console.error("Error adding log to NeDB datastore" + (err.message ? ": " + err.message : ""));
				}
			});
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
