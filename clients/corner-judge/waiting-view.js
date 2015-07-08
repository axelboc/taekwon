'use strict';

function WaitingView(io) {
	this.io = io;
	this.root = document.getElementById('waiting');

	this.cancelBtn = this.root.querySelector('.wa-btn');
	this.cancelBtn.addEventListener('click', this.io.sendFunc('cancelJoin'));
}

module.exports.WaitingView = WaitingView;
