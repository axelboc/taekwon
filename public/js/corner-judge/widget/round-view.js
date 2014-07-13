
define([
	'minpubsub',
	'handlebars',
	'../../common/competitors'

], function (PubSub, Handlebars, Competitors) {
	
	function RoundView() {
		this.root = document.getElementById('round');
		this.hongScoreBtns = this.root.querySelectorAll('.score-btns--hong > .score-btn');
		this.chongScoreBtns = this.root.querySelectorAll('.score-btns--chong > .score-btn');
		
		[].forEach.call(this.hongScoreBtns, this._bindScoreBtn.bind(this, Competitors.HONG)); 
		[].forEach.call(this.chongScoreBtns, this._bindScoreBtn.bind(this, Competitors.CHONG)); 
	}
	
	RoundView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('roundView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_bindScoreBtn: function (competitor, btn, index) {
			btn.addEventListener('click', this.onScoreBtn.bind(this, btn, competitor, index * -1 + 5));
		},
		
		onScoreBtn: function(btn, competitor, points) {
			if (window.navigator.vibrate) {
				window.navigator.vibrate(100);
			}
			
			this._publish('score', competitor, points);
		}
		
	}
	
	return RoundView;
	
});
