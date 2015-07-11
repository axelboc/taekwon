'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var Timer = require('./timer').Timer;
var stateBtnsTemplate = require('../templates/state-btns.njk');
var scoreboardsTemplate = require('../templates/scoreboards.njk');
var penaltyItemTemplate = require('../templates/penalty-item.njk');


function MatchPanel(io) {
	this.io = io;
	this.root = document.getElementById('match-panel');

	// Subscribe to events
	helpers.subscribeToEvents(io, 'matchPanel', [
		'setRoundLabel',
		'toggleInjuryTimer',
		'updateState',
		'updateScoreboards',
		'updatePenalties',
		'disablePenaltyBtns'
	], this);

	// Time keeping
	this.timeKeeping = this.root.querySelector('.time-keeping');
	var tkBeeps = document.getElementById('tk-beeps');
	this.roundTimer = new Timer('round', io, tkBeeps);
	this.injuryTimer = new Timer('injury', io, tkBeeps);

	// Match state, scores and penalties
	this.mpStateLabel = this.root.querySelector('.mp-round-label');
	this.stateInner = this.root.querySelector('.st-inner');
	this.scoreboardsInner = this.root.querySelector('.sc-inner');
	this.warningsInner = this.root.querySelector('.pe-inner--warnings');
	this.foulsInner = this.root.querySelector('.pe-inner--fouls');
	
	this.stateInner.addEventListener('click', this.onStateInnerDelegate.bind(this));
	this.warningsInner.addEventListener('click', this.onWarningsInnerDelegate.bind(this));
	this.foulsInner.addEventListener('click', this.onFoulsInnerDelegate.bind(this));
}


/* ==================================================
 * IO events
 * ================================================== */

MatchPanel.prototype.setRoundLabel = function (data) {
	this.mpStateLabel.textContent = data.label;
};

MatchPanel.prototype.toggleInjuryTimer = function (data) {
	this.timeKeeping.classList.toggle('tk_injury', data.show);
};

MatchPanel.prototype.updateState = function (data) {
	this.stateInner.innerHTML = stateBtnsTemplate.render(data.state);
};

MatchPanel.prototype.updateScoreboards = function (data) {
	this.scoreboardsInner.innerHTML = scoreboardsTemplate.render(data);
};

MatchPanel.prototype.updatePenalties = function (data) {
	this.warningsInner.innerHTML = penaltyItemTemplate.render(data.warnings);
	this.foulsInner.innerHTML = penaltyItemTemplate.render(data.fouls);
};

MatchPanel.prototype.disablePenaltyBtns = function () {
	[].forEach.call(this.root.querySelectorAll('.pe-btn'), function (btn) {
		helpers.enableBtn(btn, false);
	});
};


/* ==================================================
 * UI events
 * ================================================== */

MatchPanel.prototype.onStateInnerDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		btn.blur();
		if (btn.classList.contains('st-btn--start')) {
			this.io.send('startMatchState');
		} else if (btn.classList.contains('st-btn--end')) {
			this.io.send('endMatchState');
		} else if (btn.classList.contains('st-btn--injury')) {
			this.io.send('toggleInjury');
		}
	}
};

MatchPanel.prototype.onWarningsInnerDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		btn.blur();
		if (btn.classList.contains('pe-inc')) {
			this.io.send('incrementPenalty', {
				type: 'warnings',
				competitor: btn.dataset.competitor
			});
		} else if (btn.classList.contains('pe-dec')) {
			this.io.send('decrementPenalty', {
				type: 'warnings',
				competitor: btn.dataset.competitor
			});
		}
	}
};

MatchPanel.prototype.onFoulsInnerDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		btn.blur();
		if (btn.classList.contains('pe-inc')) {
			this.io.send('incrementPenalty', {
				type: 'fouls',
				competitor: btn.dataset.competitor
			});
		} else if (btn.classList.contains('pe-dec')) {
			this.io.send('decrementPenalty', {
				type: 'fouls',
				competitor: btn.dataset.competitor
			});
		}
	}
};

module.exports.MatchPanel = MatchPanel;
