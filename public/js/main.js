
// RequireJS configuration
require.config({
	baseUrl: '/js/' + document.documentElement.getAttribute('data-type'),
	paths: {
		domReady: '../lib/domReady',
		fastclick: '../lib/fast-click.min',
		handlebars: '../lib/handlebars.min',
		cookie: '../lib/tiny-cookie.min'
	},
	shim: {
		fastclick: { exports: 'FastClick' },
		handlebars: { exports: 'Handlebars' }
	}
});

// Main entry point
require([
	'domReady!',
	'fastclick',
	'../io',
	'./root'

], function (document, FastClick, IO, Root) {
	
	// Retrieve identity
	var identity = document.documentElement.getAttribute('data-identity');
	
	// Initialise IO and root modules
	var io = new IO(identity);
	var root = new Root(io);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
