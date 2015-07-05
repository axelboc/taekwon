'use strict';

// Dependencies
var express = require('express');
var http = require('http');
var handlebars = require('express-handlebars');
var Primus = require('primus');
var Emit = require('primus-emit');
var async = require('async');

var config = require('./config/config.json');
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

// Configure templating engine
app.engine('hbs', handlebars({
	extname: 'hbs',
	layoutsDir: 'app/templates',
	partialsDir: 'app/templates/partials',
	defaultLayout: 'layout'
}));

// Set template folder and view engine
app.set('views', 'app/templates');
app.set('view engine', 'hbs');

// Pass server-side configuration to client
app.locals.baseUrl = process.env.BASE_URL;

// Serve static files from the `public` folder
app.use(express.static(__dirname + '/public'));

// Corner Judge route
app.get('/', function (req, res) {
	var identity = 'corner-judge';
	res.render(identity, {
		identity: identity,
		title: "Corner Judge",
		metaViewport: 'width=device-width, initial-scale=1, user-scalable=no'
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
 * Initialise Primus
 */
var primus = new Primus(server, {
	transformer: 'sockjs'
});

// Add plugin
primus.use('emit', Emit);


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
		tournament = new Tournament(doc._id, primus);

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
				tournament = new Tournament(newDoc._id, primus);
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
