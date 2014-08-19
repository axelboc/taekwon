
define(['minpubsub'], function (PubSub) {
	
	function Timer(name) {
		this.name = name;
		this.intervalId = null;
		this.value = null;
	}
	
	Timer.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('timer.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_update: function () {
			this._publish('tick', this.name, this.value);
		},
		
		_tickDown: function () {
			if (this.value > 0) {
				this.value -= 1;
				this._update();
				
				if (this.value === 0) {
					this._publish('zero', this.name);
					this.stop();
				}
			}
		},
		
		_tickUp: function () {
			this.value += 1;
			this._update();
		},
		
		reset: function (value) {
			this.value = value;
			this._update();
		},
	
		start: function (down, delay) {
			// Just in case, clear the previous timer interval
			this.stop();

			var tickFunc = (down ? this._tickDown : this._tickUp).bind(this);
			
			// Timer intervals may start after a delay of 600ms:
			// 300ms to account for the sliding transition, plus 300ms for usability purposes
			window.setTimeout((function () {
				tickFunc();
				this.intervalId = window.setInterval(tickFunc, 1000);
			}).bind(this), (delay ? 600 : 0));
		},
	
		stop: function () {
			window.clearInterval(this.intervalId);
		}
		
	};
	
	return Timer;
	
});
