'use strict';

// Dependencies
var express = require('express');
var http = require('http');
var nunjucks = require('nunjucks');
var async = require('async');

var config = require('./config/config.json');
var assert = require('./app/lib/assert');
var logger = require('./app/lib/log')('app');
var DB = require('./app/lib/db');
var Tournament = require('./app/tournament').Tournament;

// Load environment variables
require('dotenv').config({ path: 'config/.env' });


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
		logger.debug("Tournament found (ID=" + doc._id + "). Restoring...");

		// If a tournament was found, restore it
		tournament = new Tournament(doc._id, server);

		// Restore its users and rings
		async.series([
			tournament.restoreUsers.bind(tournament),
			tournament.restoreRings.bind(tournament)
		], function () {
			logger.debug("> Tournament restored");
		});
	} else {
		logger.debug("Starting new tournament...");

		// Otherwise, insert a new tournament in the database
		DB.insertTournament(function (newDoc) {
			if (newDoc) {
				// Initialise the new tournament
				tournament = new Tournament(newDoc._id, server);
				tournament.createRings(config.ringCount, function () {
					logger.debug("> Tournament started (ID=" + newDoc._id + ")");
				});
			}
		});
	}
});


/*
 * Start server
 */
server.listen(80);
