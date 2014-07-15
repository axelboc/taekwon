
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../model/match-states'
	
], function (PubSub, Handlebars, Helpers, MatchStates) {
	
	function ResultPanel(ring) {
		this.ring = ring;
		this.root = document.getElementById('result-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			match: {
				ended: this._onMatchEnded
			}
		});
		
		this.winner = this.root.querySelector('.rp-winner');
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.matchConfigBtn = this.root.querySelector('.match-btn--config');
		
		this.newMatchBtn.addEventListener('click', this._publish.bind(this, 'newMatchBtn', this.newMatchBtn));
		this.matchConfigBtn.addEventListener('click', this._publish.bind(this, 'matchConfigBtn'));
		
		// Scoreboard
		this.scoreboardWrap = this.root.querySelector('.scoreboard-wrap');
		this.scoreboardTemplate = Handlebars.compile(document.getElementById('scoreboard-tmpl').innerHTML);
	}
	
	ResultPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('resultPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_showWinner: function () {
			
		},
		
		_populateScoreboard: function () {
			var match = this.ring.match;
			var states = match.states;
			
			var context = {
				match: {
					hadTwoRounds: states.indexOf(MatchStates.ROUND_2) !== -1,
					hadTieBreaker: states.indexOf(MatchStates.TIE_BREAKER) !== -1,
					hadGoldenPoint: states.indexOf(MatchStates.GOLDEN_POINT) !== -1
				},
				judges: [{
					name: "Axel",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #2",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #3",
					results: [23, 25, 12, 34, 45, 46]
				}, {
					name: "Judge #4",
					results: [23, 25, 12, 34, 45, 46]
				}]
			};

			// Evaluate scoreboard template with context
			this.scoreboardWrap.innerHTML = this.scoreboardTemplate(context);

			// Get scoreboard and cells
			var scoreboard = this.scoreboardWrap.querySelector('.scoreboard');
			var scoreboardCells = scoreboard.querySelectorAll('td');

			// Add classes to scoreboard root
			var mc = context.match;
			scoreboard.classList.toggle('sb--2-rounds', mc.hadTwoRounds);
			scoreboard.classList.toggle('sb--tie', mc.hadTieBreaker);
			scoreboard.classList.toggle('sb--golden-pt', mc.hadGoldenPoint);

			// Add classes to cells
			var cellsPerRow = context.judges[0].results.length;
			[].forEach.call(scoreboardCells, function (cell, index) {
				cell.classList.add(((index % cellsPerRow) % 2 === 0 ? 'hong-sbg' : 'chong-sbg'));
			})
		},
		
		_onMatchEnded: function () {
			this._showWinner();
			this._populateScoreboard();
		}
		
	};
	
	return ResultPanel;
	
});
