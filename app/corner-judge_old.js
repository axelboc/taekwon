
CornerJudge.prototype.onScore = function (score) {
	this.debug("Scored " + score.points + " for " + score.competitor);
	this.ring.juryPresident.cornerJudgeScored(this, score);
};
