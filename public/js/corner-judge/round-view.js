
define([
	'../common/helpers'

], function (Helpers) {
	
	function RoundView(io) {
		this.io = io;
		this.root = document.getElementById('round');
		
		// Undo button
		this.undoBtn = this.root.querySelector('.undo-btn');
		this.undoBtn.addEventListener('click', this.onUndoBtn.bind(this));
		
		// Score buttons (use 'touchstart' event if supported)
		var event = 'ontouchstart' in document.documentElement ? 'touchstart' : 'click';
		var hongBtns = this.root.querySelector('.score-btns--hong');
		var chongBtns = this.root.querySelector('.score-btns--chong');
		hongBtns.addEventListener(event, this.onScoreBtnsDeletage.bind(this, 'hong'));
		chongBtns.addEventListener(event, this.onScoreBtnsDeletage.bind(this, 'chong'));
		
		// Feedback elements
		document.addEventListener('transitionend', this.onTransitionEnd.bind(this));
		this.feedback = this.root.querySelector('.feedback');
		this.fdb = document.createElement('div');
		this.fdb.className = 'fdb';
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, 'roundView', [
			'enableUndoBtn',
			'showFdb'
		], this);
		
		// Detect translate3d support
		this.feedback.appendChild(this.fdb);
		var value = window.getComputedStyle(this.fdb).getPropertyValue('transform');
		this.has3d = value && value !== 'none';
		// Add class if not supported
		if (!this.has3d) {
			this.feedback.classList.add('no3d');
		}
	}
	
	
	/* ==================================================
	 * Inbound IO events
	 * ================================================== */
	
	RoundView.prototype.enableUndoBtn = function (data) {
		Helpers.enableBtn(this.undoBtn, data.enable);
	};

	RoundView.prototype.showFdb = function (data) {
		// Clone and customise the default fdb element
		var fdb = this.fdb.cloneNode();
		fdb.classList.add.apply(fdb.classList, [
			'fdb--' + data.score.competitor,
			(data.isUndo ? 'fdb--undo' : data.score.competitor + '-bg')
		]);
		fdb.textContent = data.score.points;

		// Add fdb element to the DOM
		this.feedback.appendChild(fdb);
		
		// Vibrate
		if (window.navigator.vibrate) {
			window.navigator.vibrate(100);
		}

		// Translate the element
		setTimeout(function () {
			var top = window.innerHeight + fdb.offsetHeight;
			if (this.has3d) {
				fdb.style.transform = 'translate3d(0, ' + top + 'px, 0)';
			} else {
				fdb.style.top = top + 'px';
			}
		}.bind(this), 0);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	RoundView.prototype.onScoreBtnsDeletage = function (competitor, evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			this.io.send('score', {
				competitor: competitor,
				points: parseInt(btn.textContent, 10)
			});
		}
	};

	RoundView.prototype.onUndoBtn = function () {
		this.undoBtn.blur();
		this.io.send('undo');
	};

	RoundView.prototype.onTransitionEnd = function (evt) {
		var fdb = evt.target;
		if (fdb.classList.contains('fdb')) {
			this.feedback.removeChild(fdb);
		}
	};
	
	return RoundView;
	
});
