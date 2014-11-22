
// Import core modules
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
		cb: function (err) {
			if (err && this.config.env === 'development') {
				console.error("logging failed: " + err.message ? err.message : "unknown error");
			}
		}
	};
	
	// Initialise logger
	var logger = new Logger({
		filename: 'data/logs.db'
	});
	

	/*
	 * Initialise tournament
	 */
	// Create a new tournament
	var tournament = new Tournament(primus, db, logger, {
		env: process.env.NODE_ENV,
		masterPwd: process.env.MASTER_PWD,
		ringCount: parseInt(process.env.RING_COUNT, 10)
	});

	// Insert the new tournament in the database
	db.tournaments.insert({
		startDate: Date.now(),
		ringIds: [],
		users: []
	}, db.cb);

	
	/*
	 * Start server
	 */
	server.listen(80);

});
