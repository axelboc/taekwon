
/**
 * 'IO' module for intialising a socket connection and listening to inbound events
 * shared by both client types (e.g. `confirmIdentity`, `setPageTitle`, etc.)
 */
define([
	'cookie',
	'./common/config',
	'./common/helpers',
	'./common/backdrop'

], function (cookie, config, Helpers, Backdrop) {
	
	function IO(identity) {
		if (!cookie.enabled()) {
			this.error({ message: "Enable cookies and try again" });
			return;
		}
		
		this.identity = identity;
		this.backdrop = new Backdrop();
		this.id = cookie.get('id');
		
		// Build server URL
		this.url = (config.isProd ? config.prodUrl : config.devUrl) + '?identity=' + identity;
		
		// Add ID parameter if available
		if (this.id) {
			this.url += '&id=' + this.id;
		}
		
		// Initialise Primus
		console.log("Connecting to server");
		this.primus = new Primus(this.url, config.primusConfig);
		
		// Listen for Web Socket events
		this.primus.on('error', this.wsError.bind(this));
		this.primus.on('reconnected', this.wsReconnected.bind(this));
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(this, 'io', [
			'saveId',
			'setPageTitle',
			'updateBackdrop',
			'alert',
			'error'
		], this);
		
		// Debug
		if (!config.isProd) {
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

			// Listen for when Primus plans on reconnecting
			this.primus.on('reconnect scheduled', function (opts) {
				console.log('Reconnecting in %d ms', opts.timeout);
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

			// Lost network connection
			this.primus.on('offline', function (msg) {
				console.warn('Offline!', msg);
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
	
	IO.prototype.wsReconnected = function () {
		console.info("Reconnected");
		this.backdrop.hide();
	};
	
	IO.prototype.saveId = function (data) {
		cookie.set('id', data.id, {
			expires: config.cookieExpires
		});
	};
	
	IO.prototype.setPageTitle = function (data) {
		document.title = data.title;
	};
	
	IO.prototype.updateBackdrop = function (data) {
		this.backdrop.update(data.text, data.subtext, data.visible);
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
	
	return IO;
	
});