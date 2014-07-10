
define([
	'minpubsub',
	'../../common/helpers',
	'../io',
	'../model/judge',
	'../view/judge-slot-view'
	
], function (PubSub, Helpers, IO, Judge, JudgeView) {
	
	function JudgeSlotController(index, view) {
		this.index = index;
		this.model = null;
		this.view = view;
		
		// Events object must be built dynamically
		this.events = {};
		
		this.events['judgeSlotView.' + this.index] = {
			acceptBtnClicked: this._onAcceptBtnClicked,
			rejectBtnClicked: this._onRejectBtnClicked,
			disconnectBtnClicked: this._onDisconnectBtnClicked
		};
		
		this.events['judge.' + this.index] = {
			authorised: this._onAuthorised,
			connectionStateChanged: this._onConnectionStateChanged
		};
		
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, this.events);
	}
	
	JudgeSlotController.prototype = {
		
		attachJudge: function (id, name, authorised, connected) {
			console.log("Attaching judge to slot (index=" + this.index + ")");
			this.model = new Judge(this.index, id, name, authorised, connected);
			this.view.attachJudge(this.model);
			if (authorised) {
				this.view.judgeAuthorised();
			}
		},
		
		_detachJudge: function () {
			this.model = null;
			this.view.detachJudge();
		},
		
		_onAcceptBtnClicked: function () {
			this.model.authorise();
		},
		
		_onRejectBtnClicked: function () {
			console.log("Judge rejected");
			IO.rejectCornerJudge(this.model.id);
			this._detachJudge();
		},
		
		_onDisconnectBtnClicked: function () {
			console.log("Judge disconnected");
			IO.removeCornerJudge(this.model.id);
			this._detachJudge();
		},
		
		_onAuthorised: function () {
			console.log("Judge authorised");
			IO.authoriseCornerJudge(this.model.id);
			this.view.judgeAuthorised();
		},
		
		setConnectionState: function (connected) {
			this.model.setConnectionState(connected);
		},
		
		_onConnectionStateChanged: function () {
			console.log("Judge connection state changed");
			this.view.connectionStateChanged();
		}
		
	};
	
	return JudgeSlotController;
	
});
