
// TODO: Fix session restoration
// TODO: Implement judges sidebar controls (buttons to add/remove judges)
// TODO: Use Full Screen API
// TODO: Fix issue: judges get duplicated in sidebar and match panel when connection with server is cut 

/* Core set-up */

// Import core modules
var http = require('http');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var Primus = require('primus');
var Emit = require('primus-emit');
var Rooms = require('primus-rooms');

// Import app modules
var config = require('./app/config');
var Tournament = require('./app/config').Tournament;
var JuryPresident = require('./app/jury-president').JuryPresident;
var CornerJudge = require('./app/corner-judge').CornerJudge;
var Ring = require('./app/ring').Ring;

// Keep track of clients
var clients = {};


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
primus.use('rooms', Rooms);

// Add middleware
primus.before('session', function (req, res, next) {
	if (!req.headers.cookie) {
		next(new Error("No cookie transmitted."));
	}

	// Parse and store cookies
	req.cookie = cookie.parse(req.headers.cookie);
	// Decode Express session ID
	req.sessionId = cookieParser.signedCookie(req.cookie[config.cookieKey], config.cookieSecret);

	next();
});


/* Routes */

// Corner Judge
app.get('/', function (request, response) {
	response.sendfile('corner-judge.html', {root: './public'});
});

// Jury President
app.get('/jury', function (request, response) {
	response.sendfile('jury-president.html', {root: './public'});
});


/* Socket events */

// Client connection
primus.on('connection', function (spark) {
	var req = spark.request;
	var session = req.session;
	var sessionId = req.sessionId;
	var client = clients[sessionId];
	var isJury = req.path.indexOf('/jury') !== -1;
	console.log("New socket connection with session ID: " + sessionId + ".");
	
	// If returning client, restore session automatically
	if (typeof client !== "undefined") {
		// Check that client hasn't switched role (from CornerJudge to JuryPresident and vice versa)
		if (isJury && client instanceof JuryPresident ||
			!isJury && client instanceof CornerJudge) {
			// Restore session
			client.restoreSession(spark);
		} else {
			// Client has switched role; remove its old instance from the system and wait for ID
			// TODO: implement exit functions of JP and CJ
			client.exit();
			waitForId(spark, sessionId);
		}
	} else {
		waitForId(spark, sessionId);
	}
});

// Client disconnection
primus.on('disconnection', function (spark) {
	console.log("Socket disconnection", spark);
});
		
// Log message
primus.on('log', function (msg) {
	console.log('Primus log:', msg);
});

/* Request and wait for client identification */
function waitForId(socket, sessionId) {
	// Listen for jury president and corner judge identification
	socket.on('juryPresident', onJPConnection.bind(this, socket, sessionId));
	socket.on('cornerJudge', onCJConnection.bind(this, socket, sessionId));

	// Inform client that we're waiting for an identification
	socket.emit('waitingForId');
	console.log("Waiting for identification...");
}

/* Handle new Jury President connection */
function onJPConnection(socket, sessionId, password) {
	// Check password
	if (password === config.masterPwd) {
		// Initialise JuryPresident
		clients[sessionId] = new JuryPresident(primus, socket, sessionId);
		console.log("> Jury president accepted: valid password");
	} else {
		// Send failure message to client
		console.log("> Jury president rejected: wrong password");
		socket.emit('idFail');
	}
}

/* Handle new Corner Judge connection */
function onCJConnection(socket, sessionId, name) {
	// Initialise CornerJudge
	clients[sessionId] = new CornerJudge(primus, socket, sessionId, name);
	console.log("> Corner judge identified: " + name);
}


/**
 * Initialise Tournament
 */
var tournament = new Tournament(primus);


/**
 * Start server
 */
server.listen(80);

