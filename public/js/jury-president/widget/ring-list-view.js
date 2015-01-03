
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function RingListView(IO) {
		this.root = document.getElementById('ring-list');
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				idSuccess: this._update,
				ringStateChanged: this._update
			}
		});
		
		this.list = this.root.querySelector('.rl-list');
		this.listTemplate = Handlebars.compile(document.getElementById('rl-list-tmpl').innerHTML);
		
		this.list.addEventListener('click', this._onListDelegate.bind(this));
	}
	
	RingListView.prototype._publish = function (subTopic) {
		PubSub.publish('ringListView.' + subTopic, [].slice.call(arguments, 1));
	};

	RingListView.prototype._update = function (data) {
		// Populate rings list from template
		this.list.innerHTML = this.listTemplate({
			ringStates: data.ringStates
		});

		console.log("Ring list view updated");
	};

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
