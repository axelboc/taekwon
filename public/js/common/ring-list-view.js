
define([
	'minpubsub',
	'handlebars'

], function (PubSub, Handlebars) {
	
	function RingListView() {
		this.root = document.getElementById('ring-list');
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
		
		_onBtn: function (btn, index) {
			btn.blur();
			this._publish('ringSelected', index);
		},
		
		updateRingBtn: function (index, enable) {
			if (!this.initialised) {
				return;
			}
			
			var btn = this.btns[index];
			if (enable) {
				btn.removeAttribute("disabled");
			} else {
				btn.setAttribute("disabled", "disabled");
			}
		},
		
		updateInstr: function (instr) {
			this.instr.textContent = instr;
		}
		
	};
	
	return RingListView;
	
});
