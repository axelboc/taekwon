'use strict';

// Dependencies
var FastClick = require('fastclick');
var IO = require('../shared/io').IO;
var helpers = require('../shared/helpers');
var LoginView = require('../shared/login-view').LoginView;
var RingListView = require('../shared/ring-list-view').RingListView;
var RoundView = require('./round-view').RoundView;

// Initialise IO and root modules
var io = new IO('jury-president');

// Initialise FastClick to remove 300ms delay on mobile devices
FastClick.attach(document.body);

// Initialise views
var currentView = null;
var views = {
	loginView: new LoginView(io),
	ringListView: new RingListView(io),
	authorisationView: { root: document.getElementById('authorisation') },
	roundView: new RoundView(io)
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
