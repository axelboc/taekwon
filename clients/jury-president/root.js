'use strict';

// Dependencies
var IO = require('../shared/io').IO;
var helpers = require('../shared/helpers');
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
