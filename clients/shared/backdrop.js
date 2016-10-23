'use strict';

function Backdrop() {
	this.root = document.getElementById('backdrop');
	this.text = this.root.querySelector('.bdp-text');
	this.subtext = this.root.querySelector('.bdp-subtext');

	this.isVisible = false;
}

Backdrop.prototype.update = function (text, subtext, visible) {
	// Vibrate when visiblity changes
	if (window.navigator.vibrate && visible !== this.isVisible) {
		window.navigator.vibrate(200);
	}

	this.text.textContent = text;
	this.subtext.textContent = subtext;

	this.isVisible = visible;
	this.root.classList.toggle('hidden', !visible);
};

Backdrop.prototype.hide = function () {
	// Vibrate when visiblity changes
	if (window.navigator.vibrate && this.isVisible) {
		window.navigator.vibrate(200);
	}

	this.isVisible = false;
	this.root.classList.add('hidden');
};

module.exports.Backdrop = Backdrop;
