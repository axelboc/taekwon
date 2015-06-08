
define([
	'../common/helpers',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (Helpers, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
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
		Helpers.subscribeToEvents(io, 'ringView', ['showPanel'], this);
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
	
	return RingView;
	
});
