'use strict';

// Dependencies
var nunjucks = require('nunjucks');
var helpers = require('../shared/helpers');
var IO = require('../shared/io').IO;

// Set up the Nunjucks environment (this must be done before requiring the views)
nunjucks.env = new nunjucks.Environment();
nunjucks.env.addFilter('time', helpers.numToTime);

// Dependencies
var LoginView = require('../shared/login-view').LoginView;
var RingListView = require('../shared/ring-list-view').RingListView;
var RingView = require('./ring-view').RingView;


// Initialise IO and root modules
var io = new IO('juryPresident');

// Initialise views
var currentView = null;
var views = {
	loginView: new LoginView(io),
	ringListView: new RingListView(io),
	ringView: new RingView(io)
};

// Subscribe to inbound IO events
helpers.subscribeToEvents(io, 'root', ['showView'], {
	
	showView: function (data) {
		// Hide the previously visible view
		if (currentView) {
			currentView.root.classList.add('hidden');
		}

		// Show the new view
		currentView = views[data.view];
		currentView.root.classList.remove('hidden');
	}
	
});
