'use strict';

// Dependencies
var assert = require('assert');
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
		assert.string(topic, 'topic');
		assert.string(name, 'name');
		assert.ok(typeof loggerData === 'undefined' || typeof loggerData === 'object' && loggerData,
				  "if provided, `loggerData` must be an object");
		
		/**
		 * The logger's main log function.
		 * @param {String} level
		 * @param {String} event (or message)
		 * @param {Object} data (optional)
		 * 		- {String} data.message (optional)
		 */
		function log(level, event, data) {
			assert.string(level, 'level');
			assert.string(event, 'event');
			assert.ok(typeof data === 'undefined' || typeof data === 'object' && data,
					  "if provided, `data` must be an object");

			// In development, log to console
			if (process.env.NODE_ENV === 'development') {
				console[level]('[' + name + '] ' + event + (data.message ? ": " + data.message : ""));
				if (level === levels.LOG) { return; }
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
			 * @param {Object} data (optional)
			 */
			info: log.bind(null, levels.INFO),
			
			/**
			 * Log warnings (ring full, cannot remove slot, etc.)
			 * @param {String} event
			 * @param {Object} data (optional)
			 * 		- {String} data.message (optional)
			 */
			warn: log.bind(null, levels.WARN),
			
			/**
			 * Log operational errors (network, socket, database, user input, etc.)
			 * @param {String} event
			 * @param {Object} data (optional)
			 * 		- {String} data.message (optional)
			 */
			error: log.bind(null, levels.ERROR)
			
		};
	}
	
};
