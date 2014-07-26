
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../../common/competitors',
	'../model/match-states'
	
], function (PubSub, Handlebars, Helpers, Competitor, MatchStates) {
	
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
		this.scoreboard = this.root.querySelector('.scoreboard');
		this.sbHeaderRow = this.scoreboard.querySelector('.sb-header-row');
		this.sbBody = this.scoreboard.querySelector('.sb-body');
	}
	
	ResultPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('resultPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_showWinner: function () {
			var winner = this.ring.match.winner;
			if (winner) {
				this.winner.className = 'rp-winner ' + winner + '-col';
				this.winner.textContent = winner.charAt(0).toUpperCase() + winner.slice(1) + " wins";
			} else {
				this.winner.className = 'rp-winner';
				this.winner.textContent = "Match is a tie";
			}
		},
		
		_buildHeaderRow: function (columns, twoRounds) {
			// First cell is empty
			this.sbHeaderRow.appendChild(document.createElement('th'));

			columns.forEach(function (columnId) {
				var cell = document.createElement('th');
				cell.setAttribute('scope', 'col');
				cell.setAttribute('colspan', '2');
				
				var label;
				if (columnId === 'main') {
					label = twoRounds ? "Rounds 1 & 2" : "Round 1";
				} else if (/^total/.test(columnId)) {
					label = "Total"
				} else {
					// TODO: provide both an ID and a name for states in MatchStates module 
					label = columnId.split('-').reduce(function (label, part) {
						return label += part.charAt(0).toUpperCase() + part.slice(1) + " ";
					}, "").slice(0, -1);
				}
				
				cell.textContent = label;
				this.sbHeaderRow.appendChild(cell);
			}, this);
		},
		
		_populateScoreboard: function () {
			var match = this.ring.match;
			var columns = match.scoreboardColumns;
			
			// Clear scoreboard table first
			this.sbHeaderRow.innerHTML = '';
			this.sbBody.innerHTML = '';
		
			// Build header row
			this._buildHeaderRow(columns, match.config.twoRounds);
			
			// Build penalties row

			// Evaluate scoreboard template with context
			/*this.scoreboardWrap.innerHTML = this.scoreboardTemplate(context);

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
			})*/
		},
		
		_onMatchEnded: function () {
			this._showWinner();
			this._populateScoreboard();
		}
		
	};
	
	return ResultPanel;
	
});
