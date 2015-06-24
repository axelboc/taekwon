
/**
 * 'IO' module for intialising a socket connection and listening to inbound events
 * shared by both client types (e.g. `confirmIdentity`, `setPageTitle`, etc.)
 */
define([
	'./common/config',
	'./common/helpers'

], function (config, Helpers) {
	
	function IO(identity) {
		this.identity = identity;
		this.url = (config.isProd ? config.prodUrl : config.devUrl) + '?identity=' + identity;
		
		// Initialise Primus
		console.log("Connecting to server");
		this.primus = new Primus(this.url, config.primusConfig)
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(this, 'io', [
			'saveId',
			'alert',
			'setPageTitle',
			'wsError',
			'error'
		], this);
		
		// Debug
		if (!config.isProd) {
			// Listen for opening of connection
			this.primus.on('open', function () {
				console.log('Connection is alive and kicking');
			});

			// Listen for connection timeouts
			this.primus.on('timeout', function (err) {
				console.log('Timeout!', err);
			});

			// Listen for closing of connection
			this.primus.on('end', function () {
				console.log('Connection closed');
			});

			// Listen for incoming data
			this.primus.on('incoming::data', function (data) {
				try {
					var obj = JSON.parse(data);
					if (obj && obj.emit) {
						console.log(obj.emit[0], obj.emit[1] ? obj.emit[1] : null);
						return;
					}
				} catch (exc) {}
				console.log(data);
			});

			// Listen for when Primus attempts to reconnect
			this.primus.on('reconnect', function () {
				console.log('Reconnect attempt started');
			});

			// Listen for when Primus has succeeded in reconnecting
			this.primus.on('reconnected', function () {
				console.log('Reconnected');
			});

			// Listen for when Primus plans on reconnecting
			this.primus.on('reconnect scheduled', function (opts) {
				console.log('Reconnecting in %d ms', opts.timeout);
				console.log('This is attempt %d out of %d', opts.attempt, opts.retries);
			});

			// Listen for reconnection timeouts
			this.primus.on('reconnect timeout', function (err) {
				console.log('Reconnection timed out', err);
			});

			// Listen for failed reconnects
			this.primus.on('reconnect failed', function (err) {
				console.log('Reconnection failed', err);
			});

			// Regained network connection
			this.primus.on('online', function (msg) {
				console.log('Online!', msg);
			});

			// Lost network connection
			this.primus.on('offline', function (msg) {
				console.log('Offline!', msg);
			});
		}
	}
	
	IO.prototype.saveId = function (data) {
		console.log(data);
	};
	
	IO.prototype.alert = function (data) {
		window.alert(data.reason);
	};
	
	IO.prototype.setPageTitle = function (data) {
		document.title = data.title;
	};
	
	IO.prototype.wsError = function (data) {
		this.onError(data);
	};
	
	IO.prototype.error = function (err) {
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
	
	IO.prototype.send = function (event, data) {
		this.primus.emit(event, data);
	};
	
	IO.prototype.sendFunc = function (event) {
		return this.send.bind(this, event);
	};
	
	return IO;
	
});