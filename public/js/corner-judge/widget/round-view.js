
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../../common/competitors'

], function (PubSub, Helpers, IO, Competitors) {
	
	function RoundView() {
		this.root = document.getElementById('round');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				ringJoined: this._onRingJoined,
				scored: this._onScored,
				undid: this._onUndid,
				undoStateChanged: this._onUndoStateChanged
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

		_onRingJoined: function(data) {
			Helpers.enableBtn(this.undoBtn, data.undoEnabled);
		},
		
		_onScoreBtn: function(btn, competitor, points) {
			console.log("Scoring " + points + " points for " + competitor);
			
			if (window.navigator.vibrate) {
				window.navigator.vibrate(100);
			}
			
			IO.score(competitor, points);
		},
		
		_onScored: function (data) {
			console.log("> Score confirmed");
			this._newFdb([
				'fdb--' + data.score.competitor,
				data.score.competitor + '-bg'
			], data.score.points);
		},
		
		_onUndid: function (data) {
			console.log("> Undo confirmed");
			this._newFdb([
				'fdb--' + data.score.competitor,
				'fdb--undo'
			], data.score.points);
		},
		
		_onUndoStateChanged: function (data) {
			console.log("Undo " + (data.enabled ? "enabled" : "disabled"));
			Helpers.enableBtn(this.undoBtn, data.enabled);
		},
		
		_onUndoBtn: function () {
			console.log("Undoing previous score");
			this.undoBtn.blur();
			IO.undo();
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
