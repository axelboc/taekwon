
define([
	'minpubsub',
	'handlebars',
	'../../common/competitors'

], function (PubSub, Handlebars, Competitors) {
	
	function RoundView() {
		this.root = document.getElementById('round');
		
		// Scoring buttons
		this.hongScoreBtns = this.root.querySelectorAll('.score-btns--hong > .score-btn');
		this.chongScoreBtns = this.root.querySelectorAll('.score-btns--chong > .score-btn');
		
		// 'touchstart' if supported; otherwise, 'click'
		var eventName = 'ontouchstart' in document.documentElement ? 'touchstart' : 'click';
		
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
			btn.addEventListener(eventName, this.onScoreBtn.bind(this, btn, competitor, index * -1 + 5));
		},
		
		onScoreBtn: function(btn, competitor, points) {
			if (window.navigator.vibrate) {
				window.navigator.vibrate(100);
			}
			
			this._publish('score', competitor, points);
			
			this.feedbackReceived(competitor, points);
		},
		
		feedbackReceived: function (competitor, points) {
			// Clone and customise the default fdb element
			var fdb = this.fdb.cloneNode();
			fdb.classList.add('fdb--' + competitor, competitor + '-bg');
			fdb.textContent = points;
			
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
