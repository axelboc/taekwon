
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
	'../common/io'

], function (document, FastClick, IO) {
	
	// Initialise IO and root modules
	var io = new IO();
	var root = new Root(io.primus);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
