
// Import core modules
var http = require('http');
var express = require('express');
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
 * Initialise Express
 */
var app = express();
var server = http.Server(app);

// Add middlewares
app.use(express.static(__dirname + '/public'));
app.use(cookieParser(config.cookieSecret));
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
		next(new Error("No cookie transmitted."));
	}

	// Parse and store cookies
	console.log(req.headers.cookie);
	req.cookie = cookie.parse(req.headers.cookie);
	// Decode Express session ID
	req.sessionId = cookieParser.signedCookie(req.cookie[config.cookieKey], config.cookieSecret);

	next();
});


/**
 * Routes
 */

// Corner Judge
app.get('/', function (request, response) {
	response.sendfile('corner-judge.html', {root: './public'});
});

// Jury President
app.get('/jury', function (request, response) {
	response.sendfile('jury-president.html', {root: './public'});
});


/**
 * Initialise Tournament
 */
var tournament = new Tournament(primus);


/**
 * Start server
 */
server.listen(80);

