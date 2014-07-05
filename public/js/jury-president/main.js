
// RequireJS configuration
require.config({
	baseUrl: '/js/jury-president',
	paths: {
		fastclick: '../lib/fast-click.min',
		handlebars: '../lib/handlebars.min',
		minpubsub: '../lib/minpubsub'
	},
	shim: {
		fastclick: { exports: 'FastClick' },
		handlebars: { exports: 'Handlebars' },
	}
});

// Jury President 'main' module
define(['../lib/domReady!', 'fastclick', './controller'], function (document, FastClick, Controller) {
	
	Controller.init();

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
