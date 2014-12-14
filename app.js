
// Import core modules
var assert = require('assert');
var logger = require('./app/lib/log')('app');
var async = require('async');
var dotenv = require('assert-dotenv');
var http = require('http');
var express = require('express');
var handlebars = require('express-handlebars');
var session = require('express-session');
var NeDBSessionStore = require('connect-nedb-session')(session);
var Datastore = require('nedb');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var Primus = require('primus');
var Emit = require('primus-emit');

// Import app modules
var Tournament = require('./app/tournament').Tournament;

// Load environment configuration
dotenv({
	dotenvFile: 'config/config.env',
	assertFile: 'config/assert.env'
}, function start() {

	// If NODE_ENV is not defined, set it to 'development'
	process.env.NODE_ENV = process.env.NODE_ENV || 'development';
	
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
	 * Load NeDB datastores
	 */
	var db = {
		tournaments: new Datastore({
			filename: 'data/tournaments.db',
			autoload: true
		}),
		users: new Datastore({
			filename: 'data/users.db',
			autoload: true
		}),
		rings: new Datastore({
			filename: 'data/rings.db',
			autoload: true
		}),
		matches: new Datastore({
			filename: 'data/matches.db',
			autoload: true
		}),

		// Default DB callback, which logs any encountered errors
		cb: function cb(err) {
			if (err) {
				logger.error(err.message);
			}
		}
	};
	

	/*
	 * Initialise tournament
	 */
	var tournament;
	
	// Get timestamp for the start of today
	var now = new Date();
	var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	
	// Look for a tournament that started today in the datastore
	db.tournaments.findOne({ startDate: { $gte: startOfToday } }, function (err, doc) {
		db.cb(err);

		if (doc) {
			logger.debug("Tournament found (ID=" + doc._id + "). Restoring...");
			
			// If a tournament was found, restore it
			if (doc.ringIds.length > 0) {
				tournament = new Tournament(doc._id, primus, db);

				// Restore its users and rings
				async.series([
					function (cb) {
						tournament.restoreUsers(doc.userIds, cb);
					},
					function(cb) {
						tournament.restoreRings(doc.ringIds, cb);
					}
				], function (err) {
					db.cb(err);
					logger.debug("> Tournament restored");
				});
			} else {
				logger.debug("> Tournament has no ring. Starting new tournament with same ID...");
				initTournament(doc._id);
			}
		} else {
			logger.debug("Starting new tournament...");
			
			// Otherwise, insert a new tournament in the datastore
			db.tournaments.insert({
				startDate: Date.now(),
				userIds: [],
				ringIds: []
			}, function (err, newDoc) {
				db.cb(err);
				if (newDoc) {
					// Initialise the new tournament
					initTournament(newDoc._id);
				}
			});
		}
	});

	/**
	 * Create a new tournament and inialise its rings.
	 * @param {String} id
	 */
	function initTournament(id) {
		assert(typeof id === 'string' && id.length > 0, "argument `id` must be a non-empty string");
		
		tournament = new Tournament(id, primus, db);
		tournament.initialiseRings(parseInt(process.env.RING_COUNT, 10), function (err) {
			db.cb(err);
			logger.debug("> Tournament started (ID=" + id + ")");
		});
	}
	
	
	/*
	 * Start server
	 */
	server.listen(80);

});
