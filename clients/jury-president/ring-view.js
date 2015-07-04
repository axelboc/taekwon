'use strict';

// Dependencies
var helpers = require('../shared/helpers');
var JudgesSidebar = require('./judges-sidebar').JudgesSidebar;
var ConfigPanel = require('./config-panel').ConfigPanel;
var MathPanel = require('./match-panel').MathPanel;
var ResultPanel = require('./result-panel').ResultPanel;


function RingView(io) {
	this.io = io;
	this.root = document.getElementById('ring');

	// Initialise panels and sidebar
	this.currentPanel = null;
	this.configPanel = new ConfigPanel(io);
	this.matchPanel = new MathPanel(io);
	this.resultPanel = new ResultPanel(io);
	this.judgesSidebar = new JudgesSidebar(io);

	// Subscribe to events
	helpers.subscribeToEvents(io, 'ringView', ['showPanel'], this);
}

RingView.prototype.showPanel = function (data) {
	// Hide the previously visible panel
	if (this.currentPanel) {
		this.currentPanel.root.classList.add('hidden');
	}

	// Show the new panel
	this.currentPanel = this[data.panel];
	this.currentPanel.root.classList.remove('hidden');
};

module.exports.RingView = RingView;
