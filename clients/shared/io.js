'use strict';

// Dependencies
/* globals Primus */
var cookie = require('tiny-cookie');
var helpers = require('./helpers');
var Backdrop = require('./backdrop').Backdrop;


/**
 * 'IO' module for intialising a socket connection and listening to inbound events
 * shared by both client types (e.g. `confirmIdentity`, `setPageTitle`, etc.)
 */
function IO(identity) {
	if (!cookie.enabled()) {
		this.error({ message: "Enable cookies and try again" });
		return;
	}

	this.identity = identity;
	this.backdrop = new Backdrop();
	this.id = cookie.get('id');

	// Build query string from identity and identifier
	this.query = 'identity=' + identity + (this.id ? '&id=' + this.id : '');

	// Initialise Primus
	console.log("Connecting to server");
	this.primus = new Primus(process.env.BASE_URL, {
		strategy: ['online', 'disconnect']
	});
	
	// Add the query parameter dynamically on every Web Socket re/connection
	this.primus.on('outgoing::url', function (url) {
		url.query = this.query;
	}.bind(this));

	// Listen for Web Socket error event
	this.primus.on('error', this.wsError.bind(this));
	// Listen for loss of network connection
	this.primus.on('offline', this.wsOffline.bind(this));

	// Subscribe to inbound IO events
	helpers.subscribeToEvents(this, 'io', [
		'saveId',
		'setPageTitle',
		'updateBackdrop',
		'hideBackdrop',
		'alert',
		'error'
	], this);

	// Debug
	if (process.env.NODE_ENV === 'development') {
		// Listen for opening of connection
		this.primus.on('open', function () {
			console.info('Connection is alive and kicking');
		});

		// Listen for connection timeouts
		this.primus.on('timeout', function (err) {
			console.warn('Timeout!', err);
		});

		// Listen for closing of connection
		this.primus.on('end', function () {
			console.info('Connection closed');
		});

		// Listen for incoming data
		this.primus.on('incoming::data', function (data) {
			try {
				var obj = JSON.parse(data);
				if (obj && obj.emit) {
					console.log(obj.emit[0], obj.emit[1]);
					return;
				}
			} catch (exc) {}
			console.log(data);
		});

		// Listen for when Primus attempts to reconnect
		this.primus.on('reconnect', function () {
			console.log('Reconnect attempt started');
		});
		
		// Listen for when Primus has managed to reconnect
		this.primus.on('reconnected', function () {
			console.info("Reconnected!");
		});

		// Listen for when Primus plans on reconnecting
		this.primus.on('reconnect scheduled', function (opts) {
			console.log('Reconnecting in %d ms', opts.scheduled);
			console.log('This is attempt %d out of %d', opts.attempt, opts.retries);
		});

		// Listen for reconnection timeouts
		this.primus.on('reconnect timeout', function (err) {
			console.warn('Reconnection timed out', err);
		});

		// Listen for failed reconnects
		this.primus.on('reconnect failed', function (err) {
			console.warn('Reconnection failed', err);
		});

		// Regained network connection
		this.primus.on('online', function (msg) {
			console.info('Online!', msg);
		});
	}
}

IO.prototype.wsError = function (err) {
	console.warn("Web Socket error", err.code);

	if (err.code === 1001) {
		// User is reloading or navigating away from the page
		return;
	}

	if (err.code === 1006) {
		// Server is down
		this.updateBackdrop({
			text: "Connection lost",
			subtext: "Attempting to reconnect...",
			visible: true
		});
		return;
	}
};

IO.prototype.wsOffline = function () {
	console.warn('Offline!');
	this.updateBackdrop({
		text: "Connection lost",
		subtext: "Check Wi-Fi settings or wait for signal to be restored",
		visible: true
	});
};

IO.prototype.saveId = function (data) {
	this.id = data.id;
	this.query = 'identity=' + this.identity + '&id=' + this.id;
	
	cookie.set('id', data.id, {
		expires: '12h'
	});
};

IO.prototype.setPageTitle = function (data) {
	document.title = data.title;
};

IO.prototype.updateBackdrop = function (data) {
	this.backdrop.update(data.text, data.subtext, data.visible);
};

IO.prototype.hideBackdrop = function () {
	this.backdrop.hide();
};

IO.prototype.alert = function (data) {
	window.alert(data.reason);
};

IO.prototype.error = function (data) {
	var msg = data.message || "Unexpected error";
	console.error('Error:', msg);

	// Hide the backdrop and all the views
	document.getElementById('backdrop').classList.add('hidden');
	[].forEach.call(document.querySelectorAll('.view'), function (view) {
		view.classList.add('hidden');
	});

	// Show the error view and the error message
	var errorView = document.getElementById('error');
	errorView.classList.remove('hidden');
	errorView.querySelector('.err-instr').textContent = msg;

	// Reload when the retry button is pressed
	errorView.querySelector('.err-btn--retry').addEventListener('click', function () {
		window.location.reload();
	});
};

IO.prototype.send = function (event, data) {
	this.primus.emit(event, data);
};

IO.prototype.sendFunc = function (event) {
	return this.send.bind(this, event);
};

module.exports.IO = IO;
