
define([
	'minpubsub',
	'handlebars',
	'../../common/helpers',
	'../io'

], function (PubSub, Handlebars, Helpers, IO) {
	
	function RingListView() {
		this.root = document.getElementById('ring-list');
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				ringStates: this._onRingStates,
				ringStateChanged: this._onRingStateChanged,
				rejected: this._updateInstr,
				ringLeft: this._updateInstr
			}
		});
		
		this.instr = this.root.querySelector('.rl-instr');
		this.btns = null;
		this.template = Handlebars.compile(document.getElementById('rl-ring-tmpl').innerHTML);
		this.initialised = false;
	}
	
	RingListView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringListView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		init: function (rings) {
			// Populate rings list from template
			var list = this.root.querySelector('.rl-list');
			list.innerHTML = this.template({
				rings: rings
			});
			
			// Retrieve ring buttons and listen for events
			this.btns = list.querySelectorAll('.rl-btn');
			[].forEach.call(this.btns, function (btn, index) {
				btn.addEventListener('click', this._onBtn.bind(this, btn, index));
			}, this);
			
			// Mark view as initialised
			this.initialised = true;
		},
		
		_onRingStates: function(data) {
			console.log("Ring states received (count=\"" + data.rings.length + "\")");
			this.init(data.rings);
		},

		_onRingStateChanged: function(data) {
			console.log("Ring state changed (index=\"" + data.index + "\")");
			
			if (!this.initialised) {
				return;
			}
			
			var btn = this.btns[data.index];
			if (data.open) {
				btn.removeAttribute("disabled");
			} else {
				btn.setAttribute("disabled", "disabled");
			}
		},
		
		_onBtn: function (btn, index) {
			btn.blur();
			IO.joinRing(index);
		},
		
		_updateInstr: function (data) {
			console.log(data.message);
			this.instr.textContent = data.message;
		}
		
	};
	
	return RingListView;
	
});
