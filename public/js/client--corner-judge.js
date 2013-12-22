
document.addEventListener("DOMContentLoaded", function domReady() {
	
	// Initialise FastClick to remove 300ms delay on mobile devices
	FastClick.attach(document.body);
	
	var socket = io.connect();
	socket.on('idYourself', function () {
		console.log("connected");
		socket.emit('cornerJudge', "Axel");
		
		setTimeout(function () {
			socket.emit('joinRing', 1);
		}, 1000);
	});
	
	socket.on('ringJoined', function (ringId) {
		console.log("Joined ring with ID=" + ringId);
	});
	
	socket.on('ringDoesNotExist', function (ringId) {
		console.log("Ring with ID=" + ringId + " does not exist");
	});
	
	socket.on('ringIsFull', function (ringId) {
		console.log("Ring with ID=" + ringId + " is full");
	});
	
	
	
	var scoreOneBtn = document.getElementById("score-1");
	
	scoreOneBtn.addEventListener("click", function scoreOneBtnClicked() {
		console.log("score-1");
		socket.emit('send', { message: "score-1" });
	});
	
});
