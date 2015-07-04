'use strict';

// Dependencies
var helpers = require('./helpers');
var ringListTemplate = require('../templates/ring-list.hbs');


function RingListView(io) {
	this.io = io;
	this.root = document.getElementById('ring-list');

	this.instr = this.root.querySelector('.rl-instr');
	this.list = this.root.querySelector('.rl-list');
	this.list.addEventListener('click', this.onListDelegate.bind(this));

	// Subscribe to events from server and views
	helpers.subscribeToEvents(io, 'ringListView', [
		'setInstr',
		'updateList'
	], this);
}


/* ==================================================
 * IO events
 * ================================================== */

RingListView.prototype.setInstr = function (data) {
	// Update instructions
	this.instr.textContent = data.text;
};

RingListView.prototype.updateList = function (data) {
	// Populate ring list from template
	this.list.innerHTML = ringListTemplate({
		isJP: this.io.identity === 'jury-president',
		rings: data.ringStates
	});
};


/* ==================================================
 * UI events
 * ================================================== */

RingListView.prototype.onListDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		btn.blur();

		var index = parseInt(btn.dataset.index, 10);
		this.io.send('selectRing', {
			index: index
		});
	}
};

module.exports.RingListView = RingListView;
