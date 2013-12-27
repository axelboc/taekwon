
var MASTER_PASSWORD = 'tkd';

// Initialie Express
var express = require('express');
var app = express();

// Jade templating engine
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

// Static files
app.use(express.static(__dirname + '/public'));

// App modules
var JuryPresident = require('./jury-president').JuryPresident;
var CornerJudge = require('./corner-judge').CornerJudge;
var Ring = require('./ring').Ring;


/* Routes */

// Corner Judge
app.get('/', function (request, response) {
	response.render('client--corner-judge');
});

// Jury President
app.get('/jury', function (request, response) {
	response.render('client--jury-president');
});


/* Sockets */

var io = require('socket.io').listen(app.listen(80));
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
	console.log("Socket connection");
	console.log("Requesting identification");
	
	// Send identification request
	socket.emit('idYourself');
	
	// Listening for jury president connection
	socket.on('juryPresident', function (password) {
		if (password === MASTER_PASSWORD) {
			console.log("> Jury president identified");
			new JuryPresident(io, socket);
			socket.emit('idSuccess');
		} else {
			console.log("> Jury president rejected: incorrect password");
			socket.emit('idFail');
			socket.disconnect();
		}
	});
	
	// Listening for corner judge connection
	socket.on('cornerJudge', function (name) {
		console.log("> Corner judge identified");
		new CornerJudge(io, socket, name);
		socket.emit('idSuccess');
		
		// Send list of available rings to client
		socket.emit('ringsList', Ring.getIds());
	});
	
	socket.on('disconnect', function () {
		console.log("Socket disconnection");
	});
});