
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
io.set('log level', 4);

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
	
	console.log("New socket connection with session ID: " + hs.sessionID + ". Waiting for identification...");
	
	if (session.identified) {
		switch (session.role) {
			case 'jp':
				onJPConnection(socket, Config.masterPwd);
				break;
			case 'cj':
				onCJConnection(socket, session.name);
				break;
			default:
		}
	} else {
		// Listening for jury president connection
		socket.on('juryPresident', onJPConnection.bind(null, socket));
		
		// Listening for jury president connection
		socket.on('cornerJudge', onCJConnection.bind(null, socket));
	}
	
	// Listen to disconnection
	socket.on('disconnect', function () {
		console.log("Socket disconnection");
	});
});


/* Handle Jury President connection */
function onJPConnection(socket, password) {
	var hs = socket.handshake;
	var session = hs.session;
	
	if (password === Config.masterPwd) {
		console.log("> Jury president accepted: valid password");
		new JuryPresident(io, socket);
		socket.emit('idSuccess');

		// Send ring allocations to client
		socket.emit('ringAllocations', Ring.getRingAllocations());
		
		// Save session information
		session.identified = true;
		session.role = 'jp';
	} else {
		console.log("> Jury president rejected: wrong password");
		socket.emit('idFail');
		
		// Save session information
		session.identified = false;
	}
	
	// Persist session
	sessionStore.set(hs.sessionID, session, function () {
		console.log(sessionStore);
	});
}

/* Handle Corner Judge connection */
function onCJConnection(socket, name) {
	var hs = socket.handshake;
	var session = hs.session;
	
	console.log("> Corner judge identified");
	new CornerJudge(io, socket, name);
	socket.emit('idSuccess');

	// Send ring allocations to client
	socket.emit('ringAllocations', Ring.getRingAllocations());
	
	// Save session information
	session.identified = true;
	session.role = 'cj';
	session.name = name;
	
	// Persist session
	sessionStore.set(hs.sessionID, session, function () {
		console.log(sessionStore);
	});
}


