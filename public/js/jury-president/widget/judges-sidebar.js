
define([
	'handlebars',
	'../../common/helpers'

], function (Handlebars, Helpers) {
	
	function JudgesSidebar(io) {
		this.root = document.getElementById('judges-sidebar');
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'judgesSidebar', ['updateSlotList'], this);

		this.list = this.root.querySelector('.js-list');
		this.listTemplate = Handlebars.compile(document.getElementById('js-list-tmpl').innerHTML);
		
		this.addSlotBtn = this.root.querySelector('.js-add');
		this.removeSlotBtn = this.root.querySelector('.js-remove');
		
		this.list.addEventListener('click', this.onListDelegate.bind(this));
		this.addSlotBtn.addEventListener('click', this.onAddSlotBtn.bind(this));
		this.removeSlotBtn.addEventListener('click', this.onRemoveSlotBtn.bind(this));
	}
		
	
	/* ==================================================
	 * IO events
	 * ================================================== */

	JudgesSidebar.prototype.updateSlotList = function updateSlotList(data) {
		// Execute template
		this.list.innerHTML = this.listTemplate({
			slots: data.slots
		});
	};

	
	/* ==================================================
	 * UI events
	 * ================================================== */

	JudgesSidebar.prototype.onListDelegate = function onListDelegate(evt) {
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

	JudgesSidebar.prototype.onAddSlotBtn = function onAddSlotBtn() {
		this.addSlotBtn.blur();
		IO.addSlot();
	};

	JudgesSidebar.prototype.onRemoveSlotBtn = function onRemoveSlotBtn() {
		this.removeSlotBtn.blur();
		IO.removeSlot();
	};
	
	return JudgesSidebar;
	
});
