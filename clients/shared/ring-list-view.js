'use strict';

// Dependencies
var helpers = require('./helpers');
var ringListTemplate = require('../templates/ring-list.njk');


function RingListView(io) {
	this.io = io;
	this.root = document.getElementById('ring-list');

	this.instr = this.root.querySelector('.rl-instr');
	this.defaultInstrTxt = this.instr.textContent;
	
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
	this.instr.textContent = data.text || this.defaultInstrTxt;
};

RingListView.prototype.updateList = function (data) {
	// Populate ring list from template
	this.list.innerHTML = ringListTemplate.render({
		isJP: this.io.identity === 'juryPresident',
		rings: data.rings
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
