
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../defaults',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (PubSub, Helpers, IO, defaults, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
	function RingView() {
		this.root = document.getElementById('ring');
		
		// Initialise panels and sidebar
		this.currentPanel = null;
		this.configPanel = new ConfigPanel(defaults.match);
		this.matchPanel = new MathPanel();
		this.resultPanel = new ResultPanel();
		this.judgesSidebar = new JudgesSidebar();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				ringOpened: this._showPanel.bind(this, this.configPanel),
				configureMatch: this._showPanel.bind(this, this.configPanel),
				matchCreated: this._showPanel.bind(this, this.matchPanel),
				resultsComputed: this._showPanel.bind(this, this.resultPanel)
			}
		});
	}
	
	RingView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringView.' + subTopic, [].slice.call(arguments, 1));
		},
		
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
