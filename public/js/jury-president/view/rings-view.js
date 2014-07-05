
define(['minpubsub', 'handlebars'], function (PubSub, Handlebars) {
	
	function RingsView() {
		this.root = document.getElementById('rings-view');
		this.btns = null;
		this.allocs = null;
		this.template = Handlebars.compile(document.getElementById('ring-allocation-tmpl').innerHTML);
	}
	
	RingsView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringsView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		init: function (allocs) {
			this.allocs = allocs;
			
			// Populate rings list from template
			var list = this.root.querySelector('.rings-list');
			list.innerHTML = this.template({
				allocs: this.allocs
			});
			
			// Retrieve ring buttons and listen for events
			this.btns = list.querySelectorAll('.rings-btn');
			[].forEach.call(this.btns, function (btn, index) {
				btn.addEventListener('click', this._onBtn.bind(this, index));
			}, this);
		},
		
		updateRingAllocation: function (alloc) {
			var btn = this.btns[alloc.index - 1];
			if (alloc.allocated) {
				btn.setAttribute("disabled", "disabled");
			} else {
				btn.removeAttribute("disabled");
			}
		},
		
		_onBtn: function (index) {
			this._publish('ringSelected', index);
		}
		
	};
	
	return RingsView;
	
});
