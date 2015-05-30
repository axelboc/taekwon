
/**
 * 'IO' module for setting up a socket connection.
 * HACK
 */
define([
	'./config',
	'./helpers'

], function (config, Helpers) {
	
	function IO(identity) {
		this.identity = identity;
		this.url = config.isProd ? config.prodUrl : config.devUrl;
		
		// Initialise Primus
		console.log("Connecting to server");
		this.primus = new Primus(this.url, config.primusConfig)
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(this.primus, 'io', [
			'confirmIdentity',
			'alert',
			'setPageTitle',
			'wsError',
			'error'
		], this);
		
		// Debug
		if (!config.isProd) {
			// Listen for opening of connection
			this.primus.on('open', function open() {
				console.log('Connection is alive and kicking');
			});

			// Listen for incoming data
			this.primus.on('data', function data(data) {
				console.log(data);
			});

			// Listen for when Primus attempts to reconnect
			this.primus.on('reconnect', function reconnect() {
				console.log('Reconnect attempt started');
			});

			// Listen for when Primus plans on reconnecting
			this.primus.on('reconnecting', function reconnecting(opts) {
				console.log('Reconnecting in %d ms', opts.timeout);
				console.log('This is attempt %d out of %d', opts.attempt, opts.retries);
			});

			// Listen for timeouts
			this.primus.on('timeout', function timeout(msg) {
				console.log('Timeout!', msg);
			});

			// Listen for closing of connection
			this.primus.on('end', function end() {
				console.log('Connection closed');
			});

			// Regained network connection
			this.primus.on('online', function online(msg) {
				console.log('Online!', msg);
			});

			// Lost network connection
			this.primus.on('offline', function offline(msg) {
				console.log('Offline!', msg);
			});
		}
	}
	
	IO.prototype.onConfirmIdentity = function onConfirmIdentity() {
		this.primus.emit('identityConfirmation', {
			identity: this.identity
		});
	};
	
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
			// Hide the backdrop and all the views
			document.getElementById('backdrop').classList.add('hidden');
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