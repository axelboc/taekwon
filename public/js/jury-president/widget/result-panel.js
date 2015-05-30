
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../../common/competitors'
	
], function (PubSub, Handlebars, Helpers, Competitor) {
	
	function ResultPanel(io) {
		this.root = document.getElementById('result-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'resultPanel', [
			'matchResultsComputed',
			'showEndBtns',
			'updateScoreboard'
		], this);
		
		this.winner = this.root.querySelector('.rp-winner');
		this.continueBtnsWrap = document.getElementById('rp-buttons--continue');
		this.endMatchBtn = this.root.querySelector('.match-btn--end');
		this.continueMatchBtn = this.root.querySelector('.match-btn--continue');
		this.endBtnsWrap = document.getElementById('rp-buttons--end');
		this.matchConfigBtn = this.root.querySelector('.match-btn--config');
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		
		this.endMatchBtn.addEventListener('click', IO.endMatch);
		this.continueMatchBtn.addEventListener('click', IO.continueMatch);
		this.matchConfigBtn.addEventListener('click', this._publish.bind(this, 'configureMatch'));
		this.newMatchBtn.addEventListener('click', IO.createMatch);
		
		// Scoreboard
		this.scoreboard = this.root.querySelector('.scoreboard');
		this.sbHeaderRow = this.scoreboard.querySelector('.sb-header-row');
		this.sbBody = this.scoreboard.querySelector('.sb-body');
	}
	
	ResultPanel.prototype._appendHeaderCell = function (parent, scope, colspan, className, label) {
		var cell = document.createElement('th');
		cell.setAttribute('scope', 'col');
		if (colspan > 1) {
			cell.setAttribute('colspan', colspan.toString(10));
		}
		cell.className = className;
		cell.textContent = label;
		parent.appendChild(cell);
		return cell;
	};

	ResultPanel.prototype._appendBodyCell = function (parent, className, label) {
		var cell = document.createElement('td');
		cell.className = className;
		cell.textContent = label;
		parent.appendChild(cell);
		return cell;
	};

	ResultPanel.prototype._buildHeaderRow = function (columns, twoRounds) {
		// First cell is empty
		this.sbHeaderRow.appendChild(document.createElement('th'));

		columns.forEach(function (columnId) {
			var label;
			if (columnId === 'main') {
				label = twoRounds ? "Rounds 1 & 2" : "Round 1";
			} else if (/^total/.test(columnId)) {
				label = "Total"
			} else {
				label = columnId.split('-').reduce(function (label, part) {
					return label += part.charAt(0).toUpperCase() + part.slice(1) + " ";
				}, "").slice(0, -1);
			}

			this._appendHeaderCell(this.sbHeaderRow, 'col', 2, '', label);
		}, this);
	};

	ResultPanel.prototype._buildPenaltiesRow = function (columns, penalties, type) {
		var row = document.createElement('tr');
		row.className = 'sb-row--' + type;
		this._appendHeaderCell(row, 'row', 1, '', type.charAt(0).toUpperCase() + type.slice(1));
		this.sbBody.appendChild(row);

		columns.forEach(function (columnId) {
			if (penalties[columnId][type]) {
				this._appendBodyCell(row, 'hong-sbg', penalties[columnId][type].hong);
				this._appendBodyCell(row, 'chong-sbg', penalties[columnId][type].chong);
			} else if (type === 'warnings') {
				this._appendBodyCell(row, 'hong-sbg', penalties[columnId].hong).setAttribute('rowspan', '2');
				this._appendBodyCell(row, 'chong-sbg', penalties[columnId].chong).setAttribute('rowspan', '2');
			}
		}, this);
	};

	ResultPanel.prototype._buildJudgeRow = function (columns, name, scoreboard) {
		var row = document.createElement('tr');
		this._appendHeaderCell(row, 'row', 1, '', name);
		this.sbBody.appendChild(row);

		columns.forEach(function (columnId) {
			var isTotalCol = /^total/.test(columnId);
			var scores = scoreboard[columnId] || { hong: 0, chong: 0 };
			var diff = scores.hong - scores.chong;

			this._appendBodyCell(row, isTotalCol && diff >= 0 ? 'hong-bg' : 'hong-sbg', scores.hong);
			this._appendBodyCell(row, isTotalCol && diff <= 0 ? 'chong-bg' : 'chong-sbg', scores.chong);
		}, this);
	};


	/* ==================================================
	 * IO events
	 * ================================================== */

	ResultPanel.prototype.matchResultsComputed = function matchResultsComputed(data) {
		// Show winner
		if (data.winner) {
			this.winner.className = 'rp-winner ' + data.winner + '-col';
			this.winner.textContent = data.winner.charAt(0).toUpperCase() + data.winner.slice(1) + " wins";
		} else {
			this.winner.className = 'rp-winner';
			this.winner.textContent = "Draw";
		}

		// Show buttons to continue or end the match
		this.continueBtnsWrap.classList.remove('hidden');
		this.endBtnsWrap.classList.add('hidden');
	};

	ResultPanel.prototype.showEndBtns = function showEndBtns() {
		// Show buttons to start a new match or change the match configuration
		this.continueBtnsWrap.classList.add('hidden');
		this.endBtnsWrap.classList.remove('hidden');
	};

	ResultPanel.prototype.updateScoreboard = function updateScoreboard(data) {
		var columns = data.scoreboardColumns;

		// Clear scoreboard table first
		this.sbHeaderRow.innerHTML = '';
		this.sbBody.innerHTML = '';

		// Build header row
		this._buildHeaderRow(columns, data.config.twoRounds);

		// Build penalties row
		this._buildPenaltiesRow(columns, data.penalties, 'warnings');
		this._buildPenaltiesRow(columns, data.penalties, 'fouls');

		// Build judge rows
		Object.keys(data.cjNames).forEach(function (cjId) { 
			this._buildJudgeRow(columns, data.cjNames[cjId], data.scoreboards[cjId]);
		}, this);
	};


	/* ==================================================
	 * UI events
	 * ================================================== */


	
	return ResultPanel;
	
});
