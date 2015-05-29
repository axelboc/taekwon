
define([
	'../../common/helpers'

], function (Helpers) {
	
	// The number of seconds by which to increase or decrease the time configurations
	var TIME_INCREMENT = 15;
	
	function ConfigPanel(io) {
		this.root = document.getElementById('config-panel');
		
		// Subscribe to events
		Helpers.subscribeToEvents(io, 'configPanel', {
			config: this._updateConfig
		}, this);
		
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.newMatchBtn.addEventListener('click', IO.createMatch);
		
		this.configInner = this.root.querySelector('.cf-inner');
		this.configInnerTemplate = Handlebars.compile(document.getElementById('cf-inner-tmpl').innerHTML);
		this.configInner.addEventListener('click', this._onConfigInnerDelegate.bind(this));
	}
	
	ConfigPanel.prototype._numToTime = function (num) {
		var sec = num % 60;
		return Math.floor(num / 60) + ":" + (sec < 10 ? '0' : '') + sec;
	};
	
	ConfigPanel.prototype._prepareContext = function (configItems) {
		return Object.keys(configItems).reduce(function (arr, itemName) {
			var item = configItems[itemName];
			
			item.name = itemName;
			item.isTime = item.type === 'time';
			item.isBoolean = item.type === 'boolean';
			
			if (item.isTime) {
				item.isDecEnabled = item.isTime && (item.value - TIME_INCREMENT) > 0;
				item.value = this._numToTime(item.value);
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

	ConfigPanel.prototype._updateConfig = function (data) {
		// Execute template
		this.configInner.innerHTML = this.configInnerTemplate({
			configItems: this._prepareContext(data.config)
		});
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */

	ConfigPanel.prototype._onConfigInnerDelegate = function (evt) {
		var btn = evt.target;
		if (btn && btn.nodeName == 'BUTTON') {
			var item = btn.parentElement.parentElement;
			var value;
			
			switch (item.dataset.type) {
				case 'time':
					value = TIME_INCREMENT * (btn.classList.contains('cf-dec') ? -1 : 1);
					break;
				case 'boolean':
					value = !btn.classList.contains('cf-false');
					break;
			}
			
			IO.setConfigItem(item.dataset.name, value);
		}
	};
	
	return ConfigPanel;
	
});
