
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../../common/competitors'

], function (PubSub, Helpers, IO, Competitors) {
	
	function RoundView() {
		this.root = document.getElementById('round');
		
		// Undo button
		this.undoBtn = this.root.querySelector('.undo-btn');
		this.undoBtn.addEventListener('click', this._onUndoBtn.bind(this));
		
		// Score buttons (use 'touchstart' event if supported)
		var event = 'ontouchstart' in document.documentElement ? 'touchstart' : 'click';
		var hongBtns = this.root.querySelector('.score-btns--hong');
		var chongBtns = this.root.querySelector('.score-btns--chong');
		hongBtns.addEventListener(event, this._onScoreBtsDeletage.bind(this, Competitors.HONG));
		chongBtns.addEventListener(event, this._onScoreBtsDeletage.bind(this, Competitors.CHONG));
		
		// Feedback elements
		document.addEventListener('transitionend', this._onTransitionEnd.bind(this));
		this.feedback = this.root.querySelector('.feedback');
		this.fdb = document.createElement('div');
		this.fdb.className = 'fdb';
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				scored: this._onScored,
				undid: this._onUndid,
				roundView: {
					undoBtn: this._updateUndoBtn
				}
			}
		});
		
		// Detect translate3d support
		this.feedback.appendChild(this.fdb);
		var value = window.getComputedStyle(this.fdb).getPropertyValue('transform');
		this.has3d = value && value !== 'none';
		// Add class if not supported
		if (!this.has3d) {
			this.feedback.classList.add('no3d');
		}
	}
	
	RoundView.prototype._publish = function (subTopic) {
		PubSub.publish('roundView.' + subTopic, [].slice.call(arguments, 1));
	};

	RoundView.prototype._newFdb = function (classes, value) {
		// Clone and customise the default fdb element
		var fdb = this.fdb.cloneNode();
		fdb.classList.add.apply(fdb.classList, classes);
		fdb.textContent = value;

		// Add fdb element to the DOM
		this.feedback.appendChild(fdb);

		// Translate the element
		setTimeout(function () {
			var value = window.innerHeight + fdb.offsetHeight;
			if (this.has3d) {
				fdb.style.transform = 'translate3d(0, ' + value + 'px, 0)';
			} else {
				fdb.style.top = value + 'px';
			}
		}.bind(this), 0);
	};

	
	/* ==================================================
	 * IO events
	 * ================================================== */

	RoundView.prototype._updateUndoBtn = function (data) {
		console.log("Undo " + (data.enabled ? "enabled" : "disabled"));
		Helpers.enableBtn(this.undoBtn, data.enabled);
	};
	
	RoundView.prototype._onScored = function (data) {
		console.log("> Score confirmed");
		this._newFdb([
			'fdb--' + data.score.competitor,
			data.score.competitor + '-bg'
		], data.score.points);

		if (window.navigator.vibrate) {
			window.navigator.vibrate(100);
		}
	};

	RoundView.prototype._onUndid = function (data) {
		console.log("> Undo confirmed");
		this._newFdb([
			'fdb--' + data.score.competitor,
			'fdb--undo'
		], data.score.points);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	RoundView.prototype._onScoreBtsDeletage = function (competitor, evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			IO.score(competitor, parseInt(btn.textContent, 10));
		}
	};

	RoundView.prototype._onUndoBtn = function () {
		this.undoBtn.blur();
		IO.undo();
	};

	RoundView.prototype._onTransitionEnd = function (evt) {
		var fdb = evt.target;
		if (fdb.classList.contains('fdb')) {
			this.feedback.removeChild(fdb);
		}
	};
	
	return RoundView;
	
});
