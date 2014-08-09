
JuryPresident.prototype.cornerJudgeScored = function (cornerJudge, score) {
	score.judgeId = cornerJudge.id;
	this.socket.emit('cornerJudgeScored', score);
};
