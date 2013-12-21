
document.addEventListener("DOMContentLoaded", function domReady() {
	
	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
	var socket = io.connect();
	socket.on('id-yourself', function () {
		console.log("connected");
		socket.emit('corner-judge');
	});
	
	var scoreOneBtn = document.getElementById("score-1");
	
	scoreOneBtn.addEventListener("click", function scoreOneBtnClicked() {
		console.log("score-1");
		socket.emit('send', { message: "score-1" });
	});
	
});
