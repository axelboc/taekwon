'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var config = require('../../config/config.json').timer;


function Timer(name, io, beep) {
	this.name = name;
	this.io = io;
	this.beep = beep;

	this.root = document.getElementById(name + '-timer');
	this.min = this.root.querySelector('.tk-timer-min');
	this.sec = this.root.querySelector('.tk-timer-sec');

	this.intervalId = null;
	this.value = null;

	// Subscribe to events
	helpers.subscribeToEvents(io, name + 'Timer', [
		'reset',
		'start',
		'stop'
	], this);
	
	// Stop timer on error
	this.io.primus.on('error', this.stop.bind(this));
	this.io.primus.on('offline', this.stop.bind(this));
	this.io.primus.on('io.error', this.stop.bind(this));
}

Timer.prototype.reset = function (data) {
	this.value = data.value;
	this._valueChanged();
};

Timer.prototype.start = function (data) {
	// Just in case, clear the previous timer interval
	this.stop();
	
	// Determine which tick function to use
	var tickFunc = (data.countDown ? this._tickDown : this._tickUp).bind(this);

	// Timer intervals may start after a delay to account for the injury timer sliding transition
	window.setTimeout((function () {
		tickFunc();
		this.intervalId = window.setInterval(tickFunc, 1000);
	}).bind(this), (data.delay ? config.toggleDelay : 0));
};

Timer.prototype.stop = function () {
	window.clearInterval(this.intervalId);
};

Timer.prototype._tickDown = function () {
	if (this.value > 0) {
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
	this.value += 1;
	this._valueChanged();
};

Timer.prototype._valueChanged = function () {
	var sec = this.value % 60;
	this.sec.textContent = (sec < 10 ? '0' : '') + sec;
	this.min.textContent = Math.floor(this.value / 60);
	
	// Send value to server every few seconds
	if (sec % config.saveInterval === 0) {
		this.io.send('saveTimerValue', {
			name: this.name,
			value: this.value
		});
	}
};

module.exports.Timer = Timer;
