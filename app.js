
// Import modules
var assert = require('./app/lib/assert');
var logger = require('./app/lib/log')('app');
var DB = require('./app/lib/db');
var Tournament = require('./app/tournament').Tournament;
var async = require('async');
var dotenv = require('assert-dotenv');
var http = require('http');
var express = require('express');
var handlebars = require('express-handlebars');
var session = require('express-session');
var NeDBSessionStore = require('connect-nedb-session')(session);
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var Primus = require('primus');
var Emit = require('primus-emit');

// Load environment configuration
dotenv({
	dotenvFile: 'config/config.env',
	assertFile: 'config/assert.env'
}, function start() {
	
	/*
	 * Initialise Express and the web server
	 */
	var app = express();
	var server = http.Server(app);

	// Configure templating
	app.engine('hbs', handlebars({
		defaultLayout: 'layout',
		extname: 'hbs',
		layoutsDir: 'views/'
	}));

	// Set view engine
	app.set('view engine', 'hbs');

	// Pass server-side configuration to client
	app.locals.baseUrl = process.env.BASE_URL;


	/*
	 * Add middlewares
	 */
	// Server static files from public folder
	app.use(express.static(__dirname + '/public'));

	// Parse cookies
	app.use(cookieParser(process.env.COOKIE_SECRET));

	// Manage session
	app.use(session({
		name: process.env.COOKIE_KEY,
		secret: process.env.COOKIE_SECRET,
		saveUninitialized: true,
		resave: true,
		store: new NeDBSessionStore({
			filename: 'data/sessions.db'
		}),
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 // one day
		}
	}));


	/*
	 * Initialise Primus
	 */
	var primus = new Primus(server, {
		transformer: 'sockjs'
	});

	// Add plugin
	primus.use('emit', Emit);

	// Add middleware
	primus.before('session', function (req, res, next) {
		if (!req.headers.cookie) {
			req.sessionId = null;
			next(new Error('Session cookie not transmitted'));
		} else {
			// Parse and store cookies
			req.cookie = cookie.parse(req.headers.cookie);
			// Decode Express session ID
			req.sessionId = cookieParser.signedCookie(
				req.cookie[process.env.COOKIE_KEY], process.env.COOKIE_SECRET);
			next(null, true);
		}
	});


	/*
	 * Routes
	 */
	// Jury President
	app.get('/jury', function (req, res) {
		var type = 'jury-president';
		res.render(type, {
			type: type,
			title: "Jury President",
			metaViewport: 'width=device-width, initial-scale=1'
		});
	});

	// Corner Judge
	app.get('/', function (req, res) {
		var type = 'corner-judge';
		res.render(type, {
			type: type,
			title: "Corner Judge",
			metaViewport: 'width=device-width, initial-scale=1, user-scalable=no'
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
					tournament.initRings(parseInt(process.env.RING_COUNT, 10), function () {
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

});
