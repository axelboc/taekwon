
// RequireJS configuration
require.config({
	baseUrl: '/js/' + document.documentElement.getAttribute('data-type'),
	paths: {
		domReady: '../lib/domReady',
		fastclick: '../lib/fast-click.min',
		handlebars: '../lib/handlebars.min',
		minpubsub: '../lib/minpubsub'
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
	
	// Initialise IO and root modules
	var io = new IO(document.documentElement.getAttribute('data-identity'));
	var root = new Root(io);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
