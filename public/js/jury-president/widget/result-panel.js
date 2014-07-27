
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
				this.winner.textContent = "Draw";
			}
		},
		
		_appendHeaderCell: function (parent, scope, colspan, className, label) {
			var cell = document.createElement('th');
			cell.setAttribute('scope', 'col');
			if (colspan > 1) {
				cell.setAttribute('colspan', colspan.toString(10));
			}
			cell.className = className;
			cell.textContent = label;
			parent.appendChild(cell);
			return cell;
		},
		
		_appendBodyCell: function (parent, className, label) {
			var cell = document.createElement('td');
			cell.className = className;
			cell.textContent = label;
			parent.appendChild(cell);
			return cell;
		},
		
		_buildHeaderRow: function (columns, twoRounds) {
			// First cell is empty
			this.sbHeaderRow.appendChild(document.createElement('th'));

			columns.forEach(function (columnId) {
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
				
				this._appendHeaderCell(this.sbHeaderRow, 'col', 2, '', label);
			}, this);
		},
		
		_buildPenaltiesRow: function (columns, penalties, type) {
			var row = document.createElement('tr');
			row.className = 'sb-row--' + type;
			this._appendHeaderCell(row, 'row', 1, '', type.charAt(0).toUpperCase() + type.slice(1));
			this.sbBody.appendChild(row);
			
			columns.forEach(function (columnId) {
				if (penalties[columnId][type]) {
					this._appendBodyCell(row, 'hong-sbg', penalties[columnId][type][0]);
					this._appendBodyCell(row, 'chong-sbg', penalties[columnId][type][1]);
				} else if (type === 'warnings') {
					this._appendBodyCell(row, 'hong-sbg', penalties[columnId][0]).setAttribute('rowspan', '2');
					this._appendBodyCell(row, 'chong-sbg', penalties[columnId][1]).setAttribute('rowspan', '2');
				}
			}, this);
		},
		
		_buildJudgeRow: function (columns, name, scoreboard) {
			var row = document.createElement('tr');
			this._appendHeaderCell(row, 'row', 1, '', name);
			this.sbBody.appendChild(row);
			
			columns.forEach(function (columnId) {
				var isTotalCol = /^total/.test(columnId);
				var scores = scoreboard[columnId];
				var diff = scores[0] - scores[1];
				
				this._appendBodyCell(row, isTotalCol && diff >= 0 ? 'hong-bg' : 'hong-sbg', scores[0]);
				this._appendBodyCell(row, isTotalCol && diff <= 0 ? 'chong-bg' : 'chong-sbg', scores[1]);
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
			this._buildPenaltiesRow(columns, match.penalties, 'warnings');
			this._buildPenaltiesRow(columns, match.penalties, 'fouls');

			// Build judge rows
			Object.keys(this.ring.judgeById).forEach(function (judgeId) { 
				var judge = this.ring.judgeById[judgeId];
				this._buildJudgeRow(columns, judge.name, judge.scoreboard);
			}, this);
		},
		
		_onMatchEnded: function () {
			this._showWinner();
			this._populateScoreboard();
		}
		
	};
	
	return ResultPanel;
	
});
