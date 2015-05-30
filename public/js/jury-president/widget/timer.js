
define(['minpubsub'], function (PubSub) {
	
	function Timer(name) {
		this.name = name;
		this.intervalId = null;
		this.value = null;
	}

	Timer.prototype.reset = function (value) {
		this.value = value;
		this._valueChanged();
	};

	Timer.prototype.start = function (down, delay) {
		// Just in case, clear the previous timer interval
		this.stop();

		var tickFunc = (down ? this._tickDown : this._tickUp).bind(this);

		// Timer intervals may start after a delay of 600ms:
		// 300ms to account for the sliding transition, plus 300ms for usability purposes
		window.setTimeout((function () {
			tickFunc();
			this.intervalId = window.setInterval(tickFunc, 1000);
		}).bind(this), (delay ? 600 : 0));
	};

	Timer.prototype.stop = function () {
		window.clearInterval(this.intervalId);
	};

	Timer.prototype._tickDown = function () {
		if (this.value > 0) {
			this.value -= 1;
			this._valueChanged();

			if (this.value === 0) {
				PubSub.publish('timer.zero', this.name);
				this.stop();
			}
		}
	};

	Timer.prototype._tickUp = function () {
		this.value += 1;
		this._valueChanged();
	};
		
	Timer.prototype._valueChanged = function () {
		PubSub.publish('timer.tick', this.name, this.value);
	};
	
	return Timer;
	
});
