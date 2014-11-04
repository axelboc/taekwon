
// Import core modules
var http = require('http');
var express = require('express');
var handlebars = require('express-handlebars');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var Primus = require('primus');
var Emit = require('primus-emit');

// Import app modules
var config = require('./app/config');
var Tournament = require('./app/tournament').Tournament;
var JuryPresident = require('./app/jury-president').JuryPresident;
var CornerJudge = require('./app/corner-judge').CornerJudge;
var Ring = require('./app/ring').Ring;


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
app.locals.baseUrl = config.baseUrl;


/*
 * Add middlewares
 */

// Server static files from public folder
app.use(express.static(__dirname + '/public'));

// Parse cookies
app.use(cookieParser(config.cookieSecret));

// Manage session
app.use(session({
	name: config.cookieKey,
	secret: config.cookieSecret,
	saveUninitialized: true,
	resave: true,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 // one day
	}
}));


/**
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
		req.sessionId = cookieParser.signedCookie(req.cookie[config.cookieKey], config.cookieSecret);
		next(null, true);
	}
});


/**
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


/**
 * Initialise Tournament
 */
var tournament = new Tournament(primus);


/**
 * Start server
 */
server.listen(80);

