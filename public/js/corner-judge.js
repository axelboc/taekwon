
document.addEventListener("DOMContentLoaded", function domReady() {
	
	var socket = io.connect();
	
	var scoreOneBtn = document.getElementById("score-1");
	
	scoreOneBtn.addEventListener("click", function scoreOneBtnClicked() {
		console.log("score-1");
		socket.emit('send', { message: "score-1" });
	});
	
});
