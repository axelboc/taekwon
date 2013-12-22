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
	// Ask client for identification
	socket.emit('idYourself');
	
	// Listening for jury president connection
	socket.on('juryPresident', function () {
		console.log("Jury president connected");
		new JuryPresident(io, socket);
	});
	
	// Listening for corner judge connection
	socket.on('cornerJudge', function (name) {
		console.log("Corner judge connected");
		new CornerJudge(io, socket, name);
	});
});


