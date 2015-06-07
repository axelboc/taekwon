
define([
	'../common/helpers',

], function (Helpers) {
	
	function Timer(name, io, beep) {
		this.name = name;
		this.io = io;
		this.beep = beep;
		
		this.root = document.getElementById(name + '-timer');
		this.min = this.root.querySelector('.tk-timer-min');
		this.sec = this.root.querySelector('.tk-timer-sec');
		
		this.intervalId = null;
		this.value = null;
		this.paused = false;
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, name + 'Timer', [
			'reset',
			'start',
			'stop',
			'pause',
			'unpause'
		], this);
	}

	Timer.prototype.reset = function (data) {
		this.value = data.value;
		this._valueChanged();
	};

	Timer.prototype.start = function (data) {
		// Just in case, clear the previous timer interval
		this.stop();

		var tickFunc = (data.countDown ? this._tickDown : this._tickUp).bind(this);

		// Timer intervals may start after a delay of 600ms:
		// 300ms to account for the sliding transition, plus 200ms for usability purposes
		// TODO: refactor with `transitionend` event?
		window.setTimeout((function () {
			tickFunc();
			this.intervalId = window.setInterval(tickFunc, 1000);
		}).bind(this), (data.delay ? 500 : 0));
	};

	Timer.prototype.stop = function () {
		window.clearInterval(this.intervalId);
	};

	Timer.prototype.pause = function () {
		this.paused = true;
	};

	Timer.prototype.unpause = function (data) {
		window.setTimeout((function () {
			this.paused = false;
		}).bind(this), (data.delay ? 500 : 0));
	};

	Timer.prototype._tickDown = function () {
		if (!this.paused && this.value > 0) {
			this.value -= 1;
			this._valueChanged();

			if (this.value === 0) {
				// Beep and stop the timer
				this.beep.play();
				this.stop();
			}
		}
	};

	Timer.prototype._tickUp = function () {
		if (!this.paused) {
			this.value += 1;
			this._valueChanged();
		}
	};
		
	Timer.prototype._valueChanged = function () {
		var sec = this.value % 60
		this.sec.textContent = (sec < 10 ? '0' : '') + sec;
		this.min.textContent = Math.floor(this.value / 60);
	};
	
	return Timer;
	
});
