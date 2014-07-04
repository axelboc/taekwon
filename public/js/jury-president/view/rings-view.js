
define(['minpubsub', 'handlebars'], function (PubSub, Handlebars) {
	
	function RingsView(root, ringAllocations) {
		this.root = root;
		this.ringBtns = null;

		this.ringCount = ringAllocations.length;
		this.ringAllocations = ringAllocations;
		
		this.template = Handlebars.compile(document.getElementById('rings-template').innerHTML);
		
		PubSub.subscribe('io.ringAllocationChanged', this.onRingAllocationChanged.bind(this));
		this._init();
	}
	
	RingsView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('ringsView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_init: function () {
			// Populate rings list from template
			var ringsList = this.root.querySelector('rings-list');
			ringsList.innerHTML = this.template({
				ringAllocations: this.ringAllocations
			});
			
			// Retrieve ring buttons and listen for events
			this.ringBtns = ringsList.querySelectorAll('rings-btn');
			[].forEach.call(this.ringBtns, function (btn, index) {
				btn.addEventListener('click', _ringBtnClicked.bind(this, index));
			}, this);
		},
		
		_ringBtnClicked: function (index) {
			this._publish('ringSelected', index);
		},
		
		onRingAllocationChanged: function (ringAllocation) {
			var ringBtn = this.ringBtns[ringAllocation.index];
			if (ringAllocation.allocated) {
				ringsBtn.setAttribute("disabled", "disabled");
			} else {
				ringsBtn.removeAttribute("disabled");
			}
		}
		
	};
	
	return RingsView;
	
});
