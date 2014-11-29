
// Import core modules
var assert = require('assert');
var dotenv = require('assert-dotenv');
var http = require('http');
var express = require('express');
var handlebars = require('express-handlebars');
var session = require('express-session');
var NeDBSessionStore = require('connect-nedb-session')(session);
var Datastore = require('nedb');
var Logger = require('nedb-logger');
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
		rings: new Datastore({
			filename: 'data/rings.db',
			autoload: true
		}),
		matches: new Datastore({
			filename: 'data/matches.db',
			autoload: true
		}),

		// Default callback which prints errors to the console in development
		cb: function cb(err) {
			if (err && this.config.env === 'development') {
				console.error("logging failed: " + err.message ? err.message : "unknown error");
			}
		}
	};
	
	
	/*
	 * Initialise logger
	 */
	var logger = new Logger({
		filename: 'data/logs.db'
	});
	
	// Custom log function
	var _log = log.bind(null, 'app');

	/**
	 * Add a new entry to the log file.
	 * When in development, if argument `name` is 'debug', argument `data` is printed to the console.
	 * @param {String} topic - (e.g. 'ring', 'match', etc.)
	 * @param {String} name - (e.g. 'opened', 'started', etc.)
	 * @param {String|Object} data - optional message or data to store with the log entry
	 */
	function log(topic, name, data) {
		assert(typeof topic === 'string' && topic.length > 0, "argument 'topic' must be a non-empty string");
		assert(typeof name === 'string' && name.length > 0, "argument 'name' must be a non-empty string");
		assert(typeof data === 'undefined' || typeof data === 'string' || typeof data === 'object', 
			   "if argument 'data' is provided, it must be a string or an object");
		
		// When in development, print debug and error messages to the console 
		if (process.env.NODE_ENV === 'development') {
			var str = '[' + topic + '] ' + data;
			if (name === 'debug') {
				console.log(str);
			} else if (name === 'error') {
				console.error(str);
			}
		}
		
		// Add a new entry to the logs
		logger.insert({
			timestamp: new Date(),
			topic: topic,
			name: name,
			data: data
		}, db.cb);
	}
	

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
			_log('debug', "Tournament found (ID=" + doc._id + "). Restoring...");
			
			// If a tournament was found, restore it
			if (doc.ringIds.length > 0) {
				tournament = new Tournament(doc._id, primus, db, log);

				// Restore its users
				tournament.restoreUsers(doc.users);

				// Restore its rings
				tournament.restoreRings(doc.ringIds, function (err) {
					db.cb(err);
					_log('debug', "> Tournament restored");
				});
			} else {
				_log('error', "> Tournament has no ring. Starting new tournament with same ID...");
				initTournament(doc._id);
			}
		} else {
			_log('debug', "Starting new tournament...");
			
			// Otherwise, insert a new tournament in the datastore
			db.tournaments.insert({
				startDate: Date.now(),
				ringIds: [],
				users: []
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
		
		tournament = new Tournament(id, primus, db, log);
		tournament.initialiseRings(parseInt(process.env.RING_COUNT, 10), function (err) {
			db.cb(err);
			_log('debug', "> Tournament started (ID=" + id + ")");
		});
	}
	
	
	/*
	 * Start server
	 */
	server.listen(80);

});
