'use strict';

// Dependencies
var Howl = require('howler').Howl;
var helpers = require('../shared/helpers');
var Timer = require('./timer').Timer;
var stateBtnsTemplate = require('../templates/state-btns.njk');
var scoreboardsTemplate = require('../templates/scoreboards.njk');
var penaltiesTemplate = require('../templates/penalties.njk');


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
	var beeps = new Howl({ urls: ['/audio/beeps.ogg', '/audio/beeps.mp3'] });
	this.timeKeeping = this.root.querySelector('.time-keeping');
	this.roundTimer = new Timer('round', io, beeps);
	this.injuryTimer = new Timer('injury', io, beeps);

	// Match state, scores and penalties
	this.rvTop = this.root.querySelector('.rv-top');
	this.stateInner = this.root.querySelector('.st-inner');
	this.scoreboardsInner = this.root.querySelector('.sc-inner');
	this.penalties = this.root.querySelector('.penalties');
	this.foulsInner = this.root.querySelector('.pe-inner--fouls');
	
	this.stateInner.addEventListener('click', this.onStateInnerDelegate.bind(this));
	this.penalties.addEventListener('click', this.onPenaltiesDelegate.bind(this));
}


/* ==================================================
 * IO events
 * ================================================== */

MatchPanel.prototype.setRoundLabel = function (data) {
	this.rvTop.textContent = data.label;
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
	this.penalties.innerHTML = penaltiesTemplate.render(data);
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
		if (btn.classList.contains('match-btn--start')) {
			this.io.send('startMatchState');
		} else if (btn.classList.contains('match-btn--end')) {
			this.io.send('endMatchState');
		} else if (btn.classList.contains('match-btn--injury')) {
			this.io.send('toggleInjury');
		}
	}
};

MatchPanel.prototype.onPenaltiesDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		btn.blur();
		
		var action = btn.classList.contains('pe-inc') ? 'incrementPenalty' :
					 (btn.classList.contains('pe-dec') ? 'decrementPenalty' : null);
		
		if (action) {
			this.io.send(action, {
				type: btn.dataset.type,
				competitor: btn.dataset.competitor
			});
		}
	}
};

module.exports.MatchPanel = MatchPanel;
