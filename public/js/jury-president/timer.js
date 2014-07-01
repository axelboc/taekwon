
/**
 * Timer
 */
define(function () {
	
	function Timer(minElem, secElem) {
		this.intervalId = null;
		this.value = null;
		
		this.minElem = minElem;
		this.secElem = secElem;
	}
	
	Timer.prototype = {
		
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
		
		
		// TODO: publish event instead
		_update: function () {
			this.minElem.textContent = Math.floor(this.value / 60);
			var sec = this.value % 60
			this.secElem.textContent = (sec < 10 ? '0' : '') + sec;
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
