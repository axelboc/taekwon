
// RequireJS configuration
require.config({
	baseUrl: '/js/' + (window.location.href.indexOf('jury') !== -1 ? 'jury-president' : 'corner-judge'),
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
