'use strict';

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var nunjucks = require('nunjucks');
var async = require('async');

var config = require('../config/config.json');
var assert = require('./lib/assert');
var log = require('./lib/log');
var DB = require('./lib/db');
var Tournament = require('./tournament').Tournament;

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import CornerJudge from './clients/corner-judge/components/root';
import JuryPresident from './clients/jury-president/components/root';


// Create logger
var logger = log.createLogger('app', "App");


/*
 * Initialise Express and the web server
 */
var app = express();
var server = http.Server(app);

// Configure Nunjucks
nunjucks.configure(['app'], {
	autoescape: false,
	express: app
});

// Set the view engine
app.set('view engine', 'njk');

// Serve static files from the `public` folder
app.use(express.static(path.join(__dirname, '../public')));

// Pass server-side configuration to client
app.locals.baseUrl = process.env.BASE_URL;
app.locals.port = process.env.PORT;

// Assert relevant configuration options
assert.ok(config.maxScore >= 3 && config.maxScore <= 5, "maximum score must be 3, 4 or 5 (current: " + config.maxScore + ")");

// Corner Judge route
app.get('/', function (req, res) {
	res.render('layout', {
		identity: 'corner-judge',
		title: "Corner Judge",
		metaViewport: 'width=device-width, initial-scale=1, user-scalable=no',
		main: ReactDOMServer.renderToString(<CornerJudge />)
	});
});

// Jury President route
app.get('/jury', function (req, res) {
	res.render('layout', {
		identity: 'jury-president',
		title: "Jury President",
		metaViewport: 'width=device-width, initial-scale=1',
		main: ReactDOMServer.renderToString(<JuryPresident />)
	});
});


/*
 * Initialise tournament
 */
var tournament;

if (process.argv.indexOf('--force') !== -1) {
	// If `--force` argument is present, create a new tournament
	createTournament();
} else {
	// Get timestamp for the start of today
	var now = new Date();
	var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	
	// Look for an open tournament in the database
	DB.findOpenTournament(startOfToday, function (doc) {
		if (doc) {
			// Initialise log module using the existing tournament's ID
			log.init(doc._id);

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
			// No open tournament found; create a new tournament
			createTournament();
		}
	});
}


/**
 * Create a new tournament.
 */
function createTournament() {
	DB.insertTournament(function (newDoc) {
		if (newDoc) {
			// Initialise log module using the new tournament's ID
			log.init(newDoc._id);

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
