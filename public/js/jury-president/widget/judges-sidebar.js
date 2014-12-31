
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function JudgesSidebar() {
		this.ring = null;
		this.root = document.getElementById('judges-sidebar');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				slotError: this._onSlotError	
			},
			ring: {
				slotsUpdated: this._updateList,
				cjAdded: this._updateList,
				cjRemoved: this._updateList
			},
			judge: {
				authorised: this._updateList,
				connectionStateChanged: this._updateList
			}
		});

		this.list = this.root.querySelector('.js-list');
		this.listTemplate = Handlebars.compile(document.getElementById('js-list-tmpl').innerHTML);
		
		this.addSlotBtn = this.root.querySelector('.js-add');
		this.removeSlotBtn = this.root.querySelector('.js-remove');
		
		this.list.addEventListener('click', this._onListDelegate.bind(this));
		this.addSlotBtn.addEventListener('click', this._onAddSlotBtn.bind(this));
		this.removeSlotBtn.addEventListener('click', this._onRemoveSlotBtn.bind(this));
	}
	
	JudgesSidebar.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('judgesSidebar.' + subTopic, [].slice.call(arguments, 1));
		},
		
		setRing: function (ring) {
			this.ring = ring;
			this._updateList();
		},
		
		_updateList: function () {
			// Prepare template context
			var slots = [];
			for (var i = 0, len = this.ring.slotCount; i < len; i += 1) {
				var cj = this.ring.cornerJudges[i];
				slots.push({
					index: i + 1,
					cj: !cj ? null : {
						id: cj.id,
						name: cj.name,
						authorised: cj.authorised,
						connected: cj.connected
					}
				});
			};
			
			// Execute template
			this.list.innerHTML = this.listTemplate({
				slots: slots
			});
		},
		
		_onSlotError: function (data) {
			alert(data.message);
		},
		
		_onListDelegate: function (evt) {
			var btn = evt.target;
			if (btn && btn.nodeName == 'BUTTON') {
				var id = btn.dataset.id;
				if (btn.classList.contains('js-judge-remove')) {
					// Ask for confirmation if a match is in progress
					if (!this.ring.match || !this.ring.match.isInProgress() || 
						confirm("Match in progress. If you continue, this judge's scores will be erased. " +
								"Remove anyway?")) {
						console.log("Judge removed");
						IO.removeCJ(id);
					}
				} else if (btn.classList.contains('js-judge-accept')) {
					console.log("Judge authorised");
					IO.authoriseCJ(id);
				} else if (btn.classList.contains('js-judge-reject')) {
					console.log("Judge rejected");
					IO.rejectCJ(id);
				}
			}
		},
		
		_onAddSlotBtn: function () {
			this.addSlotBtn.blur();
			IO.addSlot();
		},
		
		_onRemoveSlotBtn: function () {
			this.removeSlotBtn.blur();
			IO.removeSlot();
		}
		
	};
	
	return JudgesSidebar;
	
});
