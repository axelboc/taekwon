
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'./judges-sidebar',
	'./config-panel',
	'./match-panel',
	'./result-panel'
	
], function (PubSub, Helpers, IO, JudgesSidebar, ConfigPanel, MathPanel, ResultPanel) {
	
	function RingView() {
		this.root = document.getElementById('ring');
		
		// Initialise panels and sidebar
		this.currentPanel = null;
		this.configPanel = new ConfigPanel();
		this.matchPanel = new MathPanel();
		this.resultPanel = new ResultPanel();
		this.judgesSidebar = new JudgesSidebar();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				ringOpened: this._showPanel.bind(this, this.configPanel),
				configureMatch: this._showPanel.bind(this, this.configPanel),
				matchCreated: this._showPanel.bind(this, this.matchPanel),
				matchResultsComputed: this._showPanel.bind(this, this.resultPanel)
			},
			resultPanel: {
				configureMatch: this._showPanel.bind(this, this.configPanel)
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
