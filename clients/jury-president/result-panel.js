'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var resultsTemplate = require('../templates/results.njk');


function ResultPanel(io) {
	this.io = io;
	this.root = document.getElementById('result-panel');

	// Subscribe to events
	helpers.subscribeToEvents(io, 'resultPanel', [
		'setWinner',
		'showContinueBtns',
		'showEndBtns',
		'updateResults'
	], this);

	this.winner = this.root.querySelector('.rp-winner');
	this.continueBtnsWrap = document.getElementById('rp-buttons--continue');
	this.endMatchBtn = this.root.querySelector('.match-btn--endm');
	this.continueMatchBtn = this.root.querySelector('.match-btn--continue');
	this.endBtnsWrap = document.getElementById('rp-buttons--end');
	this.matchConfigBtn = this.root.querySelector('.match-btn--config');
	this.newMatchBtn = this.root.querySelector('.match-btn--new');
	this.results = this.root.querySelector('.rp-results');

	this.endMatchBtn.addEventListener('click', this.io.sendFunc('endMatch'));
	this.continueMatchBtn.addEventListener('click', this.io.sendFunc('continueMatch'));
	this.matchConfigBtn.addEventListener('click', this.io.sendFunc('configureMatch'));
	this.newMatchBtn.addEventListener('click', this.io.sendFunc('createMatch'));
}


/* ==================================================
 * IO events
 * ================================================== */

ResultPanel.prototype.setWinner = function (data) {
	if (data.winner) {
		this.winner.className = 'rp-winner ' + data.winner + '-col';
		this.winner.textContent = data.winner.charAt(0).toUpperCase() + data.winner.slice(1) + " wins";
	} else {
		this.winner.className = 'rp-winner rp-winner--draw';
		this.winner.textContent = "Draw";
	}
};

ResultPanel.prototype.showContinueBtns = function () {
	// Show buttons to continue or end the match
	this.continueBtnsWrap.classList.remove('hidden');
	this.endBtnsWrap.classList.add('hidden');
};

ResultPanel.prototype.showEndBtns = function () {
	// Show buttons to start a new match or change the match configuration
	this.continueBtnsWrap.classList.add('hidden');
	this.endBtnsWrap.classList.remove('hidden');
};

ResultPanel.prototype.updateResults = function (data) {
	this.results.innerHTML = resultsTemplate.render(data);
};

module.exports.ResultPanel = ResultPanel;
