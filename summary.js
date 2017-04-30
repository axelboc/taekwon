'use strict';

// Load environment variables
require('dotenv').config({ path: 'config/.env' });

// Dependencies
var express = require('express');
var http = require('http');
var nunjucks = require('nunjucks');

var assert = require('./app/lib/assert');
var DB = require('./app/lib/db');

var tournamentId = process.argv[2];
assert.ok(!!tournamentId, "Please provide a tournament ID");

/*
 * Initialise Express and the web server
 */
var app = express();
var server = http.Server(app);

// Configure Nunjucks
nunjucks.configure(['templates', 'templates/partials'], {
	autoescape: true,
	express: app
});

// Set the view engine
app.set('view engine', 'njk');

// Serve static files from the `public` folder
app.use(express.static(__dirname + '/public'));

// Base route to display tournament summary
app.get('/', function (req, res) {
	getTournamentData(function (data) {
		res.render('summary', data);
	});
});


// If tournament with provided ID exists, start server
var tournament;
DB.findTournament(tournamentId, function (docs) {
	assert.ok(docs && docs.length === 1, "Tournament ID is not valid");

	tournament = docs[0];
	server.listen(process.env.PORT, function () {
		console.log('Visit http://localhost');
	});
});


/**
 * Retrieve the tournament's data.
 * @param {Function} cb
 */
function getTournamentData(cb) {
	DB.findRings(tournamentId, function (docs) {
		var rings = docs.sort(function (a, b) { return a.index - b.index; })
			.map(function (doc) {
				return {
					number: doc.index + 1
				};
			});

		cb({
			tournament: tournament,
			rings: rings
		});
	});
}
