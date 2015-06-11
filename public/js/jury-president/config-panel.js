
define([
	'../common/config',
	'../common/helpers'

], function (config, Helpers) {
	
	function ConfigPanel(io) {
		this.io = io;
		this.root = document.getElementById('config-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'configPanel', ['updateConfig'], this);
		
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.newMatchBtn.addEventListener('click', this.io.sendFunc('createMatch'));
		
		this.configInner = this.root.querySelector('.cf-inner');
		this.configInnerTemplate = Handlebars.compile(document.getElementById('cf-inner-tmpl').innerHTML);
		this.configInner.addEventListener('click', this.onConfigInnerDelegate.bind(this));
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */

	ConfigPanel.prototype.updateConfig = function (data) {
		this.configInner.innerHTML = this.configInnerTemplate(data);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */

	ConfigPanel.prototype.onConfigInnerDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			var item = btn.parentElement.parentElement;
			var value;
			
			switch (item.dataset.type) {
				case 'time':
					value = btn.classList.contains('cf-dec') ? -1 : 1;
					break;
				case 'boolean':
					value = !btn.classList.contains('cf-false');
					break;
			}
			
			this.io.send('setConfigItem', {
				name: item.dataset.name,
				value: value
			});
		}
	};
	
	return ConfigPanel;
	
});
