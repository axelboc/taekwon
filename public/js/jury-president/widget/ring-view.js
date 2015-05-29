
define([
	'../../common/helpers',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (Helpers, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
	function RingView(io) {
		this.root = document.getElementById('ring');
		
		// Initialise panels and sidebar
		this.currentPanel = null;
		this.configPanel = new ConfigPanel();
		this.matchPanel = new MathPanel();
		this.resultPanel = new ResultPanel();
		this.judgesSidebar = new JudgesSidebar();
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'ringView', {
			io: {
				ringOpened: this._showPanel.bind(this, this.configPanel),
				configureMatch: this._showPanel.bind(this, this.configPanel),
				matchCreated: this._showPanel.bind(this, this.matchPanel),
				matchResultsComputed: this._showPanel.bind(this, this.resultPanel)
			},
			resultPanel: {
				configureMatch: this._showPanel.bind(this, this.configPanel)
			}
		}, this);
	}
	
	RingView.prototype = {
		
		_showPanel: function (newPanel) {
			// Hide the previously visible panel
			if (this.currentPanel) {
				this.currentPanel.root.classList.add('hidden');
			}
			
			// Show the new panel
			newPanel.root.classList.remove('hidden');
			this.currentPanel = newPanel;
		}
		
	};
	
	return RingView;
	
});
