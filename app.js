
/* Core set-up */

// Import core modules
var express = require('express');
var exphbs = require('express3-handlebars');
var socket = require('socket.io');
var connectUtils = require('./node_modules/express/node_modules/connect/lib/utils');
var cookie = require('cookie');

// Import app modules
var Config = require('./app/config');
var JuryPresident = require('./app/jury-president').JuryPresident;
var CornerJudge = require('./app/corner-judge').CornerJudge;
var Ring = require('./app/ring').Ring;

// Initialise Express
var app = express();

// Initialise Session Store
var sessionStore = new express.session.MemoryStore();
var clients = {};

// Configure Express
app.configure(function () {
    app.use(express.cookieParser(Config.cookieSecret));
    app.use(express.session({
		store: sessionStore,
		key: Config.cookieKey,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 // one day
		}
	}));
    
    // Initialie Handlebars templating engine
    app.set('views', __dirname + '/views');
    app.set('view engine', 'hbs');
    app.engine('hbs', exphbs());

    // Let Express know where to look for static files
    app.use(express.static(__dirname + '/public'));
});

// Initialise Socket.IO
var io = socket.listen(app.listen(80));
io.set('log level', 1);

// Configure Socket.IO
io.configure(function () {
	io.set('authorization', function (data, accept) {
		if (!data.headers.cookie) {
			return accept("No cookie transmitted.", false);
		}
		
		// Parse and store cookies in handshake data
		data.cookie = cookie.parse(data.headers.cookie);
		data.sessionID = connectUtils.parseSignedCookie(data.cookie[Config.cookieKey], Config.cookieSecret);

		sessionStore.get(data.sessionID, function (err, session) {
			if (err) {
				return accept("Error in session store.", false);
			} else if (!session) {
				return accept("Session not found.", false);
			}
			
			// Success - authenticated with a known session
			data.session = session;
			return accept(null, true);
		});
	});
});


/* Routes */

// Corner Judge
app.get('/', function (request, response) {
	response.render('corner-judge', {ringAllocations: Ring.getRingAllocations()});
});

// Jury President
app.get('/jury', function (request, response) {
	response.render('jury-president', {ringAllocations: Ring.getRingAllocations()});
});


/* Socket events */

io.sockets.on('connection', function (socket) {
	var hs = socket.handshake;
	var session = hs.session;
	var sessionId = hs.sessionID;
	console.log("New socket connection with session ID: " + sessionId + ".");
	
	if (typeof clients[sessionId] !== "undefined") {
		// If returning client, restore session automatically
		clients[sessionId].restoreSession(socket);
	} else {
		// Listen for jury president and corner judge identification
		socket.on('juryPresident', onJPConnection.bind(this, socket, sessionId));
		socket.on('cornerJudge', onCJConnection.bind(this, socket, sessionId));
		
		// Inform client that we're waiting for an identification
		socket.emit('waitingForId');
		console.log("Waiting for identification...");
	}
});


/* Handle new Jury President connection */
function onJPConnection(socket, sessionId, password) {
	// Check password
	if (password === Config.masterPwd) {
		// Initialise JuryPresident
		clients[sessionId] = new JuryPresident(io, socket, sessionId);
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
	clients[sessionId] = new CornerJudge(io, socket, sessionId, name);
	console.log("> Corner judge identified: " + name);
}
