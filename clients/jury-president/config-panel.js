'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var configItemsTemplate = require('../templates/config-items.njk');


function ConfigPanel(io) {
	this.io = io;
	this.root = document.getElementById('config-panel');

	// Subscribe to events
	helpers.subscribeToEvents(io, 'configPanel', ['updateConfig'], this);

	this.newMatchBtn = this.root.querySelector('.match-btn--new');
	this.configInner = this.root.querySelector('.cf-inner');
	
	this.newMatchBtn.addEventListener('click', this.io.sendFunc('createMatch'));
	this.configInner.addEventListener('click', this.onConfigInnerDelegate.bind(this));
}


/* ==================================================
 * IO events
 * ================================================== */

ConfigPanel.prototype.updateConfig = function (data) {
	this.configInner.innerHTML = configItemsTemplate.render(data);
};


/* ==================================================
 * UI events
 * ================================================== */

ConfigPanel.prototype.onConfigInnerDelegate = function (evt) {
	var btn = evt.target;
	if (btn && btn.nodeName === 'BUTTON') {
		var item = btn.parentElement.parentElement;
		var value;

		switch (item.dataset.type) {
			case 'time':
				value = btn.classList.contains('cf-dec') ? -1 : 1;
				break;
			case 'boolean':
				value = !btn.classList.contains('cf-false');
				break;
		}

		this.io.send('setConfigItem', {
			name: item.dataset.name,
			value: value
		});
	}
};

module.exports.ConfigPanel = ConfigPanel;
