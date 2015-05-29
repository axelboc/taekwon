
define([
	'handlebars',
	'../../common/helpers'

], function (Handlebars, Helpers) {
	
	function RingListView(io) {
		this.root = document.getElementById('ring-list');
		
		this.list = this.root.querySelector('.rl-list');
		this.list.addEventListener('click', this._onListDelegate.bind(this));
		this.listTemplate = Handlebars.compile(document.getElementById('rl-list-tmpl').innerHTML);
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(io, 'ringListView', {
			ringList: this._updateRingList
		}, this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	RingListView.prototype._updateRingList = function (data) {
		// Populate ring list from template
		this.list.innerHTML = this.listTemplate({
			rings: data.rings
		});
		console.log("Ring list updated");
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	RingListView.prototype._onListDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			btn.blur();
			
			var index = parseInt(btn.dataset.index, 10);
			IO.openRing(index);
			
			console.log("Open ring #" + (index + 1));
		}
	};
		
	return RingListView;
	
});
