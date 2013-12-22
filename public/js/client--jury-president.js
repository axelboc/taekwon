
document.addEventListener("DOMContentLoaded", function domReady() {
	
	var socket = io.connect();
	
	socket.on('idYourself', function () {
		console.log("connected");
		socket.emit('juryPresident');
		
		setTimeout(function () {
			console.log("Creating ring");
			socket.emit('createRing', 1);
		}, 1000);
	});
	
	socket.on('ringCreated', function (ringId) {
		console.log("Ring created with ID=" + ringId);
	});
	
	socket.on('ringAlreadyExists', function (ringId) {
		console.log("Ring with ID=" + ringId + " already exists");
	});
	
	socket.on('authoriseCornerJudge', function (cornerJudgeId) {
		console.log("Authorising corner judge with ID=" + cornerJudgeId);
		socket.emit('cornerJudgeAuthorised', cornerJudgeId);
	});
	
});
