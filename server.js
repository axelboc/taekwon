var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/public');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

app.get('/', function(request, response){
	response.render("corner-judge");
});

var io = require('socket.io').listen(app.listen(80));

io.sockets.on('connection', function (socket) {
	console.log("corner judge connected");
	
	socket.on('send', function (data) {
		console.log(data);
	});
});
