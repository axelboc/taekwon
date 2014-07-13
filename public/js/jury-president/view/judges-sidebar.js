
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function JudgesSidebar(slotCount) {
		this.root = document.getElementById('judges-sidebar');
		this.slotCount = slotCount;
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			judge: {
				initialised: this._onJudgeInitialised,
				authorised: this._onJudgeAuthorised,
				connectionStateChanged: this._onJudgeConnectionStateChanged
			}
		});

		// Prepare template context
		var indices = [];
		for (var i = 0; i < this.slotCount; i += 1) {
			indices.push(i + 1);
		}

		// Populate judge list from template
		this.list = this.root.querySelector('.js-list');
		this.listTemplate = Handlebars.compile(document.getElementById('js-list-tmpl').innerHTML);
		this.list.innerHTML = this.listTemplate({
			indices: indices
		});
		
		this.slots = [];
		this.slotsById = {};
		
		[].forEach.call(this.list.querySelectorAll('.js-judge'), function (elem, index) {
			var slot = {
				index: index,
				judge: null,
				name: elem.querySelector('.js-judge-name'),
				state: elem.querySelector('.js-judge-state'),
				btnList: elem.querySelector('.js-judge-btns'),
				acceptBtn: elem.querySelector('.js-judge-accept'),
				rejectBtn: elem.querySelector('.js-judge-reject'),
				disconnectBtn: elem.querySelector('.js-judge-disconnect')
			}
			
			slot.acceptBtn.addEventListener('click', this._onAcceptBtn.bind(this, index));
			slot.rejectBtn.addEventListener('click', this._onRejectBtn.bind(this, index));
			slot.disconnectBtn.addEventListener('click', this._onDisconnectBtn.bind(this, index));
			
			this.slots.push(slot);
		}, this);
		
	}
	
	JudgesSidebar.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('judgesSidebar.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_updateSlot: function (slot) {
			var judge = slot.judge;
			
			// Update name and state
			if (!judge) {
				slot.name.textContent = "Judge #" + (slot.index + 1);
				slot.state.textContent = "Waiting for connection";
			} else {
				slot.name.textContent = judge.name;
				if (judge.connected) {
					slot.state.textContent = "Connected";
				} else {
					slot.state.textContent = "Connection lost. Waiting for reconnection...";
				}
			}
			
			// Toggle elements
			slot.state.classList.toggle('hidden', judge && !judge.authorised);
			slot.btnList.classList.toggle('hidden', !judge || judge.authorised);
			slot.disconnectBtn.classList.toggle('hidden', !judge || !judge.authorised);
		},
		
		_findFreeJudgeSlot: function () {
			for (var i = 0; i < this.slotCount; i += 1) {
				// Slot is free if no judge is allocated to it
				var slot = this.slots[i];
				if (!slot.judge) {
					return slot;
				}
			}
		},
		
		_onJudgeInitialised: function (id, judge) {
			var slot = this._findFreeJudgeSlot();
			
			slot.judge = judge;
			this.slotsById[id] = slot;
			
			this._updateSlot(slot);
		},
		
		_onJudgeAuthorised: function (id) {
			var slot = this.slotsById[id];
			this._updateSlot(slot);
		},
		
		_onJudgeConnectionStateChanged: function (id, connected) {
			this._updateSlot(this.slotsById[id]);
		},
		
		_detachJudge: function (slot) {
			delete this.slotsById[slot.judge.id]
			slot.judge = null;
			this._updateSlot(slot);
		},
		
		_onAcceptBtn: function (index) {
			this.slots[index].judge.authorise();
		},
		
		_onRejectBtn: function (index) {
			console.log("Judge rejected");
			var slot = this.slots[index];
			IO.rejectCornerJudge(slot.judge.id);
			this._detachJudge(slot);
		},
		
		_onDisconnectBtn: function (index) {
			console.log("Judge disconnected");
			var slot = this.slots[index];
			IO.removeCornerJudge(slot.judge.id);
			this._detachJudge(slot);
		},
		
	};
	
	return JudgesSidebar;
	
});
