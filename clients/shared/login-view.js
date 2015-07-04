'use strict';

// Dependencies
var helpers = require('./helpers');


function LoginView(io) {
	this.io = io;
	this.root = document.getElementById('login');

	this.instr = this.root.querySelector('.login-instr');
	this.field = this.root.querySelector('.login-field');
	this.btn = this.root.querySelector('.login-btn');
	this.btn.addEventListener('click', this.sendIdentification.bind(this));

	// Cancel form submission
	this.root.querySelector('.login-form').addEventListener('submit', function (evt) {
		evt.preventDefault();
	});

	// Subscribe to events from server and views
	helpers.subscribeToEvents(io, 'login', [
		'setInstr',
		'focusField',
		'blurField',
		'shakeResetField'
	], this);
}

LoginView.prototype.sendIdentification = function () {
	this.io.send('identification', {
		identity: this.io.identity,
		value: this.field.value
	});
};


/* ==================================================
 * IO events
 * ================================================== */

LoginView.prototype.setInstr = function (data) {
	// Update instructions
	this.instr.textContent = data.text;
};

LoginView.prototype.focusField = function () {
	// HACK: set focus on field
	setTimeout(function () {
		this.field.focus();
	}.bind(this), 100);
};

LoginView.prototype.blurField = function () {
	this.field.blur();
};

LoginView.prototype.shakeResetField = function () {
	// Reset, focus and shake field
	this.field.value = "";
	this.field.focus();
	helpers.shake(this.field);
};

module.exports.LoginView = LoginView;
