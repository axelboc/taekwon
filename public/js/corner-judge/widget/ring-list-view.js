
define([
	'handlebars',
	'../../common/helpers'

], function (Handlebars, Helpers) {
	
	function RingListView(io) {
		this.root = document.getElementById('ring-list');
		
		this.instr = this.root.querySelector('.rl-instr');
		this.list = this.root.querySelector('.rl-list');
		this.list.addEventListener('click', this._onListDelegate.bind(this));
		this.listTemplate = Handlebars.compile(document.getElementById('rl-list-tmpl').innerHTML);
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(io, 'ringListView', [
			'updateInstr',
			'updateList'
		], this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	RingListView.prototype.updateInstr = function (data) {
		// Update instructions
		this.instr.textContent = data.message;
	};
	
	RingListView.prototype.updateList = function (data) {
		// Populate ring list from template
		this.list.innerHTML = this.listTemplate({
			rings: data.rings
		});
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	RingListView.prototype._onListDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			
			var index = parseInt(btn.dataset.index, 10);
			IO.joinRing(index);
			
			console.log("Join ring #" + (index + 1));
		}
	};

	return RingListView;
	
});
