
// RequireJS configuration
require.config({
	baseUrl: '/js/' + (document.documentElement.getAttribute('data-type')),
	paths: {
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
	'../lib/domReady!',
	'fastclick',
	'./root',
	'../common/io'

], function (document, FastClick, Root, IO) {
	
	// Initialise Web Socket connection
	var io = IO.init();
	
	// Initialise root component
	var root = new Root(io);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
