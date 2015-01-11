
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function RingListView() {
		this.root = document.getElementById('ring-list');
		
		this.instr = this.root.querySelector('.rl-instr');
		this.list = this.root.querySelector('.rl-list');
		this.list.addEventListener('click', this._onListDelegate.bind(this));
		this.listTemplate = Handlebars.compile(document.getElementById('rl-list-tmpl').innerHTML);
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				ringListView: {
					instr: this._updateInstr,
					ringList: this._updateRingList
				}
			}
		});
	}
	
	RingListView.prototype._publish = function (subTopic) {
		PubSub.publish('ringListView.' + subTopic, [].slice.call(arguments, 1));
	};
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	RingListView.prototype._updateInstr = function (data) {
		// Update instructions
		this.instr.textContent = data.message;
		console.log(data.message);
	};
	
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
			IO.joinRing(index);
			
			console.log("Join ring #" + (index + 1));
		}
	};

	return RingListView;
	
});
