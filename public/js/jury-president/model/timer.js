
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
