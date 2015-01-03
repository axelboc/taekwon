
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function JudgesSidebar() {
		this.root = document.getElementById('judges-sidebar');
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				ringOpened: this._onRingOpened,
				slotsUpdated: this._onSlotsUpdated,
				slotNotRemoved: this._onSlotNotRemoved
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
		
	JudgesSidebar.prototype._publish = function (subTopic) {
		PubSub.publish('judgesSidebar.' + subTopic, [].slice.call(arguments, 1));
	};

	JudgesSidebar.prototype.update = function (slots) {
		// Execute template
		this.list.innerHTML = this.listTemplate({
			slots: slots
		});
	};
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	JudgesSidebar.prototype._onRingOpened = function (data) {
		this.update(data.slots);
	};
	
	JudgesSidebar.prototype._onSlotsUpdated = function (data) {
		this.update(data.slots);
	};

	JudgesSidebar.prototype._onSlotNotRemoved = function (data) {
		alert(data.reason);
	};

	
	/* ==================================================
	 * UI events
	 * ================================================== */

	JudgesSidebar.prototype._onListDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			var id = btn.dataset.id;
			if (btn.classList.contains('js-judge-remove')) {
				// FIXIT: Ask for confirmation if a match is in progress - move to server
				/*if (!this.ring.match || !this.ring.match.isInProgress() || 
					confirm("Match in progress. If you continue, this judge's scores will be erased. " +
							"Remove anyway?")) {*/
				console.log("Judge removed");
				IO.removeCJ(id);
			} else if (btn.classList.contains('js-judge-accept')) {
				console.log("Judge authorised");
				IO.authoriseCJ(id);
			} else if (btn.classList.contains('js-judge-reject')) {
				console.log("Judge rejected");
				IO.rejectCJ(id);
			}
		}
	};

	JudgesSidebar.prototype._onAddSlotBtn = function () {
		this.addSlotBtn.blur();
		IO.addSlot();
	};

	JudgesSidebar.prototype._onRemoveSlotBtn = function () {
		this.removeSlotBtn.blur();
		IO.removeSlot();
	};
	
	return JudgesSidebar;
	
});
