
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
	
	function RingView(ring) {
		this.ring = ring;
		this.root = document.getElementById('ring');
		
		// Initialise sidebar and panels
		this.judgesSidebar = new JudgesSidebar(ring);
		this.configPanel = new ConfigPanel(ring, defaults.match);
		this.matchPanel = new MathPanel(ring);
		this.resultPanel = new ResultPanel(ring);
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				slotAdded: this._onSlotAdded,
				slotRemoved: this._onSlotRemoved,
				cjAdded: this._onCJAdded,
				cjRemoved: this._onCJRemoved,
				cjAuthorised: this._onCJAuthorised,
				cjScored: this._onCJScored,
				cjConnectionStateChanged: this._onCJConnectionStateChanged,
				cjExited: this._onCJExited
			},
			ring: {
				matchInProgress: this._onMatchInProgress
			},
			match: {
				created: this._onMatchCreated,
				resultsComputed: this._onResultsComputed
			},
			configPanel: {
				newMatchBtn: this._onNewMatchBtn
			},
			resultPanel: {
				matchConfigBtn: this._onMatchConfigBtn,
				continueMatchBtn: this._onContinueMatchBtn,
				newMatchBtn: this._onNewMatchBtn
			}
		});
	}
	
	RingView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onSlotAdded: function () {
			this.ring.addSlot();
		},
		
		_onSlotRemoved: function () {
			this.ring.removeSlot();
		},
		
		_onCJAdded: function (data) {
			console.log("New corner judge (id=" + data.id + ")");
			this.ring.addCJ(data.id, data.name, false, data.connected);
		},
		
		_onCJRemoved: function (data) {
			console.log("Corner judge removed from ring (id=" + data.id + ")");
			this.ring.removeCJ(data.id);
		},
		
		_onCJAuthorised: function (data) {
			console.log("Corner judge authorised (id=" + data.id + ")");
			this.ring.authoriseCJ(data.id);
		},
		
		_onCJScored: function (data) {
			console.log("Judge scored (points=" + data.points + ")");
			this.ring.score(data.id, data.competitor, data.points);
		},
		
		_onCJConnectionStateChanged: function (data) {
			console.log("Judge connection state changed (connected=" + data.connected + ")");
			this.ring.judgeStateChanged(data.id, data.connected);
		},
		
		_onCJExited: function (data) {
			console.log("Judge exited");
			// Detach judge
			this.ring.removeCJ(data.id);
		},
		
		_onMatchInProgress: function (judgeId) {
			console.log("Cannot join ring: match in progress");
			IO.rejectCJ(judgeId, "Match in progress");
		},
		
		_showPanel: function (panel) {
			this.configPanel.root.classList.toggle('hidden', panel !== this.configPanel);
			this.matchPanel.root.classList.toggle('hidden', panel !== this.matchPanel);
			this.resultPanel.root.classList.toggle('hidden', panel !== this.resultPanel);
		},
		
		_onNewMatchBtn: function (btn) {
			btn.blur();
			this.ring.newMatch(this.configPanel.getConfig());
		},
		
		_onMatchCreated: function () {
			// Ask judges to reset their scoreboard
			this.ring.resetScoreboards();
			
			// Show match panel
			this._showPanel(this.matchPanel);
		},
		
		_onResultsComputed: function () {
			// Show result panel
			this._showPanel(this.resultPanel);
		},
		
		_onMatchConfigBtn: function () {
			// Show config panel
			this._showPanel(this.configPanel);
		},
		
		_onContinueMatchBtn: function () {
			// Show match panel
			this._showPanel(this.matchPanel);
		}
		
	};
	
	return RingView;
	
});
