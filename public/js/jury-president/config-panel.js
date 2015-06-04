
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
	
	ConfigPanel.prototype.numToTime = function numToTime(num) {
		var sec = num % 60;
		return Math.floor(num / 60) + ":" + (sec < 10 ? '0' : '') + sec;
	};
	
	ConfigPanel.prototype.prepareContext = function prepareContext(configItems) {
		return Object.keys(configItems).reduce(function (arr, itemName) {
			var item = configItems[itemName];
			
			item.name = itemName;
			item.isTime = item.type === 'time';
			item.isBoolean = item.type === 'boolean';
			
			if (item.isTime) {
				item.isDecEnabled = item.isTime && (item.value - config.timeConfigStep) > 0;
				item.value = this.numToTime(item.value);
			} else if (item.isBoolean) {
				item.isFalse = item.value === false;
				item.isTrue = item.value === true;
			}
			
			arr.push(item);
			return arr;
		}.bind(this), []);
	};
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */

	ConfigPanel.prototype.updateConfig = function updateConfig(data) {
		// Execute template
		this.configInner.innerHTML = this.configInnerTemplate({
			configItems: this.prepareContext(data.config)
		});
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */

	ConfigPanel.prototype.onConfigInnerDelegate = function onConfigInnerDelegate(evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			var item = btn.parentElement.parentElement;
			var value;
			
			switch (item.dataset.type) {
				case 'time':
					value = config.timeConfigStep * (btn.classList.contains('cf-dec') ? -1 : 1);
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
