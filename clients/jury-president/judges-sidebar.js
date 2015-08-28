'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var judgeSlotsTemplate = require('../templates/judge-slots.njk');


function JudgesSidebar(io) {
	this.io = io;
	this.root = document.getElementById('judges-sidebar');

	// Subscribe to events
	helpers.subscribeToEvents(io, 'judgesSidebar', [
		'setHeading',
		'updateSlotList'
	], this);

	this.heading = this.root.querySelector('.js-heading');
	this.list = this.root.querySelector('.js-list');
	this.addSlotBtn = this.root.querySelector('.js-add');
	this.removeSlotBtn = this.root.querySelector('.js-remove');

	this.list.addEventListener('click', this.onListDelegate.bind(this));
	this.addSlotBtn.addEventListener('click', this.onAddSlotBtn.bind(this));
	this.removeSlotBtn.addEventListener('click', this.onRemoveSlotBtn.bind(this));
}


/* ==================================================
 * IO events
 * ================================================== */

JudgesSidebar.prototype.setHeading = function (data) {
	this.heading.textContent = data.text;
};

JudgesSidebar.prototype.updateSlotList = function (data) {
	// Execute template
	this.list.innerHTML = judgeSlotsTemplate.render(data);
};


/* ==================================================
 * UI events
 * ================================================== */

JudgesSidebar.prototype.onListDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		// Prepare IO data
		var data = {
			id: btn.dataset.id
		};

		if (btn.classList.contains('js-judge-remove')) {
			// FIXIT: Ask for confirmation if a match is in progress - move to server
			/*if (!this.ring.match || !this.ring.match.isInProgress() || 
				confirm("Match in progress. If you continue, this judge's scores will be erased. " +
						"Remove anyway?")) {*/
			this.io.send('removeCJ', data);
		} else if (btn.classList.contains('js-judge-accept')) {
			this.io.send('authoriseCJ', data);
		} else if (btn.classList.contains('js-judge-reject')) {
			this.io.send('rejectCJ', data);
		}
	}
};

JudgesSidebar.prototype.onAddSlotBtn = function () {
	this.addSlotBtn.blur();
	this.io.send('addSlot');
};

JudgesSidebar.prototype.onRemoveSlotBtn = function () {
	this.removeSlotBtn.blur();
	this.io.send('removeSlot');
};

module.exports.JudgesSidebar = JudgesSidebar;
