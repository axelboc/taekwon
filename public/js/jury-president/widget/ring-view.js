
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
				matchCreated: this.initMatch,
			},
			match: {
				resultsComputed: this._onResultsComputed
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
		},
		
		initMatch: function () {
			// Create the match
			this.ring.createMatch(this.configPanel.getConfig());
			this.matchPanel.setMatch(this.ring.match);
			console.log("Match created");
			
			// Ask judges to reset their scoreboard
			this.ring.resetScoreboards();
			
			// Show match panel
			this._showPanel(this.matchPanel);
		},
		
		_onResultsComputed: function () {
			// Show result panel
			this._showPanel(this.resultPanel);
		}
		
	};
	
	return RingView;
	
});
