// Initialie Express
var express = require('express');
var app = express();

// Jade templating engine
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

// Static files
app.use(express.static(__dirname + '/public'));


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
	// Ask client for identification
	socket.emit('id-yourself');
	
	// Listening for jury president connection
	socket.on('jury-president', function () {
		console.log("jury president connected");
	});
	
	// Listening for corner judge connection
	socket.on('corner-judge', function () {
		console.log("corner judge connected");
	});
});




