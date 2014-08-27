
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function JudgesSidebar(ring) {
		this.ring = ring;
		this.root = document.getElementById('judges-sidebar');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			ring: {
				slotAdded: this._onSlotAdded,
				slotRemoved: this._onSlotRemoved
			},
			judge: {
				initialised: this._onJudgeInitialised,
				authorised: this._onJudgeAuthorised,
				connectionStateChanged: this._onJudgeConnectionStateChanged
			}
		});

		this.list = this.root.querySelector('.js-list');
		this.judgeTemplate = Handlebars.compile(document.getElementById('js-judge-tmpl').innerHTML);
		
		this.slots = [];
		this.slotsById = {};
		
		this.addSlotBtn = this.root.querySelector('.js-add');
		this.removeSlotBtn = this.root.querySelector('.js-remove');
		
		this.addSlotBtn.addEventListener('click', this._onAddSlotBtn.bind(this));
		this.removeSlotBtn.addEventListener('click', this._onRemoveSlotBtn.bind(this));
	}
	
	JudgesSidebar.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('judgesSidebar.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onSlotAdded: function (index) {
			console.log("Judge slot added (index=" + index + ")");
			var elem = document.createElement('li');
			elem.className = 'js-judge';
			elem.innerHTML = this.judgeTemplate({ index: index + 1 });
			this.list.appendChild(elem);
			
			var slot = {
				index: index,
				judge: null,
				root: elem,
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
		},
		
		_onSlotRemoved: function (index) {
			console.log("Judge slot removed (index=" + index + ")");
			this.list.removeChild(this.slots[index].root);
			this.slots.splice(index, 1);
		},
		
		_onAddSlotBtn: function () {
			this.addSlotBtn.blur();
			this.ring.addSlot(this.ring.judgeSlotCount);
		},
		
		_onRemoveSlotBtn: function () {
			this.removeSlotBtn.blur();
			this.ring.removeSlot(this.slots.length - 1);
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
		
		_onJudgeInitialised: function (id, judge) {
			var slot = this.slots[judge.index];
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
			var id = slot.judge.id;
			delete this.slotsById[id]
			slot.judge = null;
			this._updateSlot(slot);
			this._publish('judgeDetached', id, slot.index);
		},
		
		detachJudgeWithId: function (id) {
			this._detachJudge(this.slotsById[id]);
		},
		
		_onAcceptBtn: function (index) {
			this.slots[index].judge.authorise();
		},
		
		_onRejectBtn: function (index) {
			console.log("Judge rejected");
			var slot = this.slots[index];
			IO.rejectCJ(slot.judge.id, "Not authorised to join ring");
			this._detachJudge(slot);
		},
		
		_onDisconnectBtn: function (index) {
			var confirmText = "Match in progress. If you continue, this judge's scoreboard will be erased completely. Disconnect anyway?";
			
			if (!this.ring.match || !this.ring.match.isInProgress() || confirm(confirmText)) {
				console.log("Judge disconnected");
				var slot = this.slots[index];
				IO.removeCJ(slot.judge.id);
				this._detachJudge(slot);
			}
		}
		
	};
	
	return JudgesSidebar;
	
});
