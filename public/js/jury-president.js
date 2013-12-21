
document.addEventListener("DOMContentLoaded", function domReady() {
	
	var socket = io.connect();
	socket.on('id-yourself', function () {
		console.log("connected");
		socket.emit('jury-president');
	})
	
});
