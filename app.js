
var MASTER_PASSWORD = 'tkd';

// Initialie Express
var express = require('express');
var exphbs = require('express3-handlebars');
var app = express();

// Handlebars templating engine
app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');
app.engine('hbs', exphbs());

// Static files
app.use(express.static(__dirname + '/public'));

// App modules
var JuryPresident = require('./app/jury-president').JuryPresident;
var CornerJudge = require('./app/corner-judge').CornerJudge;
var Ring = require('./app/ring').Ring;


/* Routes */

// Corner Judge
app.get('/', function (request, response) {
	response.render('corner-judge');
});

// Jury President
app.get('/jury', function (request, response) {
	response.render('jury-president');
});


/* Sockets */

var io = require('socket.io').listen(app.listen(80));
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
	console.log("New socket connection. Waiting for identification...");
	
	// Listening for jury president connection
	socket.on('juryPresident', function (password) {
		if (password === MASTER_PASSWORD) {
			console.log("> Jury president accepted: valid password");
			new JuryPresident(io, socket);
			socket.emit('idSuccess');
		} else {
			console.log("> Jury president rejected: wrong password");
			socket.emit('idFail');
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