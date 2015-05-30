
/**
 * 'IO' module for setting up a socket connection.
 * HACK
 */
define([
	'./config',
	'./helpers'

], function (config, Helpers) {
	
	function IO() {
		console.log("Connecting to server");
		
		// Initialise Primus
		var url = config.isProd ? config.prodUrl : config.devUrl;
		this.primus = new Primus(url, config.primusConfig)
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, null, [
			'alert',
			'setTitle',
			'wsError',
			'error'
		], this);
		
		// Debug
		if (!config.isProd) {
			// Listen for opening of connection
			primus.on('open', function open() {
				console.log('Connection is alive and kicking');
			});

			// Listen for incoming data
			primus.on('data', function data(data) {
				console.log(data);
			});

			// Listen for when Primus attempts to reconnect
			primus.on('reconnect', function reconnect() {
				console.log('Reconnect attempt started');
			});

			// Listen for when Primus plans on reconnecting
			primus.on('reconnecting', function reconnecting(opts) {
				console.log('Reconnecting in %d ms', opts.timeout);
				console.log('This is attempt %d out of %d', opts.attempt, opts.retries);
			});

			// Listen for timeouts
			primus.on('timeout', function timeout(msg) {
				console.log('Timeout!', msg);
			});

			// Listen for closing of connection
			primus.on('end', function end() {
				console.log('Connection closed');
			});

			// Regained network connection
			primus.on('online', function online(msg) {
				console.log('Online!', msg);
			});

			// Lost network connection
			primus.on('offline', function offline(msg) {
				console.log('Offline!', msg);
			});
		}
		
		return primus;
	}
	
	IO.prototype.onAlert = function onAlert(data) {
		alert(data.reason);
	};
	
	IO.prototype.onSetTitle = function onSetTitle(data) {
		document.title = data.title;
	};
	
	IO.prototype.onError = function onError(err) {
		console.error('Error:', err.reason);
		
		// Retrieve message to display in error view
		var message = err.code ? config.errorMessages[err.code] : err.reason;

		if (message) {
			// Hide all the views
			[].forEach.call(document.querySelectorAll('.view'), function (view) {
				view.classList.add('hidden');
			});
			
			// Show the error view and the error message
			var wsErrorView = document.getElementById('ws-error');
			wsErrorView.classList.remove('hidden');
			wsErrorView.querySelector('.wse-instr').textContent = message;
			
			// Reload when the retry button is pressed
			wsErrorView.querySelector('.wse-btn--retry').addEventListener('click', function () {
				window.location.reload();
			});
		}
	};
	
	IO.prototype.onWsError = function onWsError(data) {
		this.onError(data);
	};
	
	return IO;
	
});