
// RequireJS configuration
require.config({
	baseUrl: '/js/corner-judge',
	paths: {
		fastclick: '../lib/fast-click.min'
	},
	shim: {
		fastclick: {
			exports: 'FastClick'
		}
	}
});

// Jury President 'main' module
define(['../lib/domReady!', 'fastclick', './io', './view'], function (document, FastClick, IO, View) {

	IO.init();
	View.init(IO);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
});
