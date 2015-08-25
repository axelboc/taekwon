'use strict';

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

// Dependencies
var express = require('express');
var http = require('http');
var nunjucks = require('nunjucks');
var async = require('async');

var config = require('./config/config.json');
var assert = require('./app/lib/assert');
var logger = require('./app/lib/log').createLogger('app', "App");
var DB = require('./app/lib/db');
var Tournament = require('./app/tournament').Tournament;


/*
 * Initialise Express and the web server
 */
var app = express();
var server = http.Server(app);

// Configure Nunjucks
nunjucks.configure(['app/templates', 'app/templates/partials'], {
	autoescape: true,
	express: app
});

// Set the view engine
app.set('view engine', 'njk');

// Serve static files from the `public` folder
app.use(express.static(__dirname + '/public'));

// Pass server-side configuration to client
app.locals.baseUrl = process.env.BASE_URL;
app.locals.port = process.env.PORT;

// Assert relevant configuration options
assert.ok(config.maxScore >= 3 && config.maxScore <= 5, "maximum score must be 3, 4 or 5 (current: " + config.maxScore + ")");

// Corner Judge route
app.get('/', function (req, res) {
	var identity = 'corner-judge';
	res.render(identity, {
		identity: identity,
		title: "Corner Judge",
		metaViewport: 'width=device-width, initial-scale=1, user-scalable=no',
		maxScore: config.maxScore
	});
});

// Jury President route
app.get('/jury', function (req, res) {
	var identity = 'jury-president';
	res.render(identity, {
		identity: identity,
		title: "Jury President",
		metaViewport: 'width=device-width, initial-scale=1'
	});
});


/*
 * Initialise tournament
 */
var tournament;

// Get timestamp for the start of today
var now = new Date();
var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

// Look for an open tournament
DB.findOpenTournament(startOfToday, function (doc) {
	if (doc) {
		// If a tournament was found, restore it
		tournament = new Tournament(doc._id);

		// Restore its users and rings
		async.series([
			tournament.restoreUsers.bind(tournament),
			tournament.restoreRings.bind(tournament)
		], function () {
			// The tournament has been restored and is ready to receive Web Socket connections
			tournament.ready(server);
			logger.info('tournamentRestored', { tournament: doc });
		});
	} else {
		// Otherwise, insert a new tournament in the database
		DB.insertTournament(function (newDoc) {
			if (newDoc) {
				// Initialise the new tournament
				tournament = new Tournament(newDoc._id);
				tournament.createRings(config.ringCount, function () {
					// The tournament has been initialised and is ready to receive Web Socket connections
					tournament.ready(server);
					logger.info('tournamentStarted', { tournament: newDoc });
				});
			}
		});
	}
});
