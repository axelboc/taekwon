
// RequireJS configuration
require.config({
	baseUrl: '/js/jury-president',
	paths: {
		fastclick: '../lib/fast-click.min',
		handlebars: '../lib/handlebars.min'
	},
	shim: {
		fastclick: {
			exports: 'FastClick'
		},
		handlebars: {
			exports: 'Handlebars'
		}
	}
});

// Jury President 'main' module
define(['../lib/domReady!', 'fastclick', './io', './view'], function (document, FastClick, IO, View) {
	
	IO.init();
	View.init(IO);

	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);

	// DEBUG
	/*setTimeout(function () {
		IO.sendId('tkd')
	}, 200);*/
	
});
