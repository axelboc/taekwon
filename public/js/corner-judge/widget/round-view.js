
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io',
	'../../common/competitors'

], function (PubSub, Handlebars, Helpers, IO, Competitors) {
	
	function RoundView() {
		this.root = document.getElementById('round');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				scoreConfirmed: this._onScoreConfirmed,
				canUndo: this._onCanUndo,
				undoConfirmed: this._onUndoConfirmed
			}
		});
		
		// Undo and scoring buttons
		this.undoBtn = this.root.querySelector('.undo-btn');
		this.hongScoreBtns = this.root.querySelectorAll('.score-btns--hong > .score-btn');
		this.chongScoreBtns = this.root.querySelectorAll('.score-btns--chong > .score-btn');
		
		// 'touchstart' if supported; otherwise, 'click'
		var eventName = 'ontouchstart' in document.documentElement ? 'touchstart' : 'click';
		
		this.undoBtn.addEventListener('click', this._onUndoBtn.bind(this));
		[].forEach.call(this.hongScoreBtns, this._bindScoreBtn.bind(this, eventName, Competitors.HONG)); 
		[].forEach.call(this.chongScoreBtns, this._bindScoreBtn.bind(this, eventName, Competitors.CHONG));
		document.addEventListener('transitionend', this._onTransitionEnd.bind(this));
		
		// Feedback elements
		this.feedback = this.root.querySelector('.feedback');
		this.fdb = document.createElement('div');
		this.fdb.className = 'fdb';
		
		// Detect translate3d support
		this.feedback.appendChild(this.fdb);
		var value = window.getComputedStyle(this.fdb).getPropertyValue('transform');
		this.has3d = value && value !== 'none';
		// Add class if not supported
		if (!this.has3d) {
			this.feedback.classList.add('no3d');
		}
	}
	
	RoundView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('roundView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_bindScoreBtn: function (eventName, competitor, btn, index) {
			btn.addEventListener(eventName, this._onScoreBtn.bind(this, btn, competitor, index * -1 + 5));
		},
		
		_onScoreBtn: function(btn, competitor, points) {
			console.log("Scoring " + points + " points for " + competitor);
			
			if (window.navigator.vibrate) {
				window.navigator.vibrate(100);
			}
			
			IO.score(competitor, points);
		},
		
		_onScoreConfirmed: function (score) {
			console.log("> Score confirmed");
			this._newFdb([
				'fdb--' + score.competitor,
				score.competitor + '-bg'
			], score.points);
		},
		
		_onCanUndo: function (canUndo) {
			console.log((canUndo ? "Can" : "Cannot") + " undo");
			Helpers.enableBtn(this.undoBtn, canUndo);
		},
		
		_onUndoBtn: function () {
			console.log("Undoing previous score");
			this.undoBtn.blur();
			IO.undo();
		},
		
		_onUndoConfirmed: function (score) {
			console.log("> Undo confirmed");
			this._newFdb([
				'fdb--' + score.competitor,
				'fdb--undo'
			], score.points * -1);
		},
		
		_newFdb: function (classArr, value) {
			// Clone and customise the default fdb element
			var fdb = this.fdb.cloneNode();
			fdb.classList.add.apply(fdb.classList, classArr);
			fdb.textContent = value;
			
			// Add fdb element to the DOM
			this.feedback.appendChild(fdb);
			
			// Translate the element
			setTimeout(this._transitionFdb.bind(this, fdb), 0);
		},
		
		_transitionFdb: function (fdb) {
			var value = window.innerHeight + fdb.offsetHeight;
			if (this.has3d) {
				fdb.style.transform = 'translate3d(0, ' + value + 'px, 0)';
			} else {
				fdb.style.top = value + 'px';
			}
		},
		
		_onTransitionEnd: function (evt) {
			var elem = evt.target;
			if (elem.classList.contains('fdb')) {
				this.feedback.removeChild(elem);
			}
		}
		
	}
	
	return RoundView;
	
});
