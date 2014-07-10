
define(['minpubsub', 'handlebars'], function (PubSub, Handlebars) {
	
	function JudgeSlotView(root, index) {
		this.root = root;
		this.index = index;
		this.model = null;
		
		this.name = this.root.querySelector('.judge-name');
		this.state = this.root.querySelector('.judge-state');
		this.btnList = this.root.querySelector('.judge-btns');
		this.acceptBtn = this.root.querySelector('.judge-accept');
		this.rejectBtn = this.root.querySelector('.judge-reject');
		this.disconnectBtn = this.root.querySelector('.judge-disconnect');
		
		this.acceptBtn.addEventListener('click', this._publish.bind(this, 'acceptBtnClicked'));
		this.rejectBtn.addEventListener('click', this._publish.bind(this, 'rejectBtnClicked'));
		this.disconnectBtn.addEventListener('click', this._publish.bind(this, 'disconnectBtnClicked'));
	}
	
	JudgeSlotView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('judgeSlotView.' + this.index + '.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_updateState: function () {
			if (!this.model) {
				this.state.textContent = "Waiting for connection";
			} else if (this.model.connected) {
				this.state.textContent = "Connected";
			} else {
				this.state.textContent = "Connection lost. Waiting for reconnection...";
			}
		},
		
		toggleBtnList: function (show) {
			this.state.classList.toggle('hidden', show);
			this.btnList.classList.toggle('hidden', !show);
		},
		
		attachJudge: function (judge) {
			this.model = judge;
			this.name.textContent = this.model.name;
			this.toggleBtnList(true);
		},
		
		judgeAuthorised: function () {
			this._updateState();
			this.toggleBtnList(false);
			this.disconnectBtn.classList.remove('hidden');
		},
		
		detachJudge: function () {
			this.model = null;
			this.name.textContent = "Judge #" + (this.index + 1);
			this._updateState();
			this.toggleBtnList(false);
			this.disconnectBtn.classList.add('hidden');
		},
		
		connectionStateChanged: function (connected) {
			this._updateState();
		}
		
	};
	
	return JudgeSlotView;
	
});
