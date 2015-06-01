
define([
	'handlebars',
	'./helpers'

], function (Handlebars, Helpers) {
	
	function RingListView(io) {
		this.io = io;
		this.root = document.getElementById('ring-list');
		
		this.instr = this.root.querySelector('.rl-instr');
		this.list = this.root.querySelector('.rl-list');
		this.list.addEventListener('click', this.onListDelegate.bind(this));
		this.listTemplate = Handlebars.compile(document.getElementById('rl-list-tmpl').innerHTML);
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(io, 'ringListView', [
			'setInstr',
			'updateList'
		], this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	RingListView.prototype.setInstr = function setInstr(data) {
		// Update instructions
		this.instr.textContent = data.text;
	};
	
	RingListView.prototype.updateList = function updateList(data) {
		// Populate ring list from template
		this.list.innerHTML = this.listTemplate({
			rings: data.rings
		});
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	RingListView.prototype.onListDelegate = function onListDelegate(evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			
			var index = parseInt(btn.dataset.index, 10);
			this.io.send('selectRing', {
				index: index
			});
		}
	};

	return RingListView;
	
});
