
define([
	'handlebars',
	'../common/helpers',
	'../common/states',
	'./timer'

], function (Handlebars, Helpers, MatchStates, Timer) {
	
	function MatchPanel(io) {
		this.io = io;
		this.root = document.getElementById('match-panel');
		this.config = null;
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'matchPanel', [
			'setRoundLabel',
			'toggleInjuryTimer',
			'updateState',
			'updateScoreSlots',
			'updatePenalties',
			'disablePenaltyBtns'
		], this);
		
		// Match state
		this.mpStateLabel = this.root.querySelector('.mp-round-label');
		
		// Time keeping
		this.timeKeeping = this.root.querySelector('.time-keeping');
		var tkBeeps = document.getElementById('tk-beeps');
		this.roundTimer = new Timer('round', io, tkBeeps);
		this.injuryTimer = new Timer('injury', io, tkBeeps),
		
		// Match state
		this.stateInner = this.root.querySelector('.st-inner');
		this.stateInnerTemplate = Handlebars.compile(document.getElementById('st-inner-tmpl').innerHTML);
		this.stateInner.addEventListener('click', this.onStateInnerDelegate.bind(this));
		
		// Scores
		this.scoresInner = this.root.querySelector('.sc-inner');
		this.scoresInnerTemplate = Handlebars.compile(document.getElementById('sc-inner-tmpl').innerHTML);
		
		// Penalties
		this.penaltiesTemplate = Handlebars.compile(document.getElementById('pe-penalties-tmpl').innerHTML);
		this.warningsInner = this.root.querySelector('.pe-inner--warnings');
		this.warningsInner.addEventListener('click', this.onWarningsInnerDelegate.bind(this));
		this.foulsInner = this.root.querySelector('.pe-inner--fouls');
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
		console.log("State changed", data.state);
		this.stateInner.innerHTML = this.stateInnerTemplate(data.state);
	};

	MatchPanel.prototype.updateScoreSlots = function (data) {
		this.scoresInner.innerHTML = this.scoresInnerTemplate(data);
	};

	MatchPanel.prototype.updatePenalties = function (data) {
		this.warningsInner.innerHTML = this.penaltiesTemplate(data.warnings);
		this.foulsInner.innerHTML = this.penaltiesTemplate(data.fouls);
	};

	MatchPanel.prototype.disablePenaltyBtns = function () {
		[].forEach.call(this.root.querySelectorAll('.pe-btn'), function (btn) {
			btn.setAttribute('disabled', 'disabled');
		});
	};


	/* ==================================================
	 * UI events
	 * ================================================== */

	MatchPanel.prototype.onStateInnerDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			if (btn.classList.contains('st-btn--start')) {
				this.io.send('startMatchState');
			} else if (btn.classList.contains('st-btn--end')) {
				this.io.send('endMatchState');
			} else if (btn.classList.contains('st-btn--injury')) {
				this.io.send('startEndInjury');
			}
		}
	};

	MatchPanel.prototype.onWarningsInnerDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
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
		if (btn && btn.nodeName == 'BUTTON') {
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
	
	return MatchPanel;
	
});
