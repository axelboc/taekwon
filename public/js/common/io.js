
/**
 * 'IO' module for setting up a socket connection.
 * HACK
 */
define([
	'minpubsub',
	'./config'

], function (PubSub, config) {
	
	var primus;
	
	function init() {
		console.log("Connecting to server");
		
		// Initialise Primus
		primus = new Primus(config.isProd ? config.prodUrl : config.devUrl, {
			strategy: ['online', 'disconnect']
		});
		
		// Listen for opening of connection
		primus.on('open', function open() {
			console.log('Connection is alive and kicking');
		});
		
		// Listen for incoming data
		primus.on('data', function data(data) {
			console.log(data);
		});
		
		// Listen for errors
		primus.on('error', function error(err) {
			console.error('Error:', err.reason);
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
		
		return primus;
	}
	
});