
// Dependencies
var helpers = require('../shared/helpers');
var LoginView = require('../shared/login-view').LoginView;
var RingListView = require('../ring-list-view/').RingListView;
var RoundView = require('./round-view').RoundView;

// Initialise IO and root modules
var io = new IO('jury-president');

// Initialise FastClick to remove 300ms delay on mobile devices
FastClick.attach(document.body);

// Initialise views
var currentView = null;
var loginView = new LoginView(io);
var ringListView = new RingListView(io);
var authorisationView = { root: document.getElementById('authorisation') };
var roundView = new RoundView(io);

// Subscribe to inbound IO events
helpers.subscribeToEvents(io, 'root', ['showView'], {
	
	showView: function (data) {
		// Hide the previously visible view
		if (curentView) {
			curentView.root.classList.add('hidden');
		}

		// Show the new view
		curentView = this[data.view];
		curentView.root.classList.remove('hidden');
	}
	
});
