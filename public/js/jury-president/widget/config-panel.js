
define([
	'minpubsub',
	'../../common/helpers',
	'../defaults'

], function (PubSub, Helpers, defaults) {
	
	function ConfigPanel(ring) {
		this.ring = ring;
		this.config = defaults.match;
		this.root = document.getElementById('config-panel');
		
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.newMatchBtn.addEventListener('click', this._publish.bind(this, 'newMatchBtn', this.newMatchBtn));
		
		// Loop through configuration items
		[].forEach.call(this.root.querySelectorAll('.config-item'), function (item) {
			// Use event delegation
			var type = item.dataset.type;
			var capType = type.charAt(0).toUpperCase() + type.slice(1);
			item.addEventListener('click', this['_on' + capType + 'ConfigItem'].bind(this, item));
			
			// Enable all buttons
			[].forEach.call(item.querySelectorAll('button'), function (btn) {
				btn.removeAttribute('disabled');
			});
			
			// Populate default configuration values
			var val = this.config[item.dataset.name];
			switch (type) {
				case 'time':
					item.querySelector('.ci-value').textContent = this._numToTime(val);
					break;
				case 'boolean':
					item.querySelector('.ci-' + val).classList.add('btn_pressed');
					break;
			}
		}, this);
	}
	
	ConfigPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('configPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_numToTime: function (num) {
			var sec = num % 60;
			return Math.floor(num / 60) + ":" + (sec < 10 ? '0' : '') + sec;
		},
		
		_onTimeConfigItem: function (item, evt) {
			var elem = evt.target;
			if (!elem || elem.nodeName !== 'BUTTON') {
				return;
			}
			
			elem.blur();
			var configName = item.dataset.name;
			var value = this.config[configName];
			
			// Increment or decrement time
			if (elem.classList.contains('ci-dec')) {
				value -= defaults.timeIncrements;
				
				// If next decrement would reach 0, disable button
				if (value <= defaults.timeIncrements) {
					elem.setAttribute('disabled', 'disabled');
				}
			} else if (elem.classList.contains('ci-inc')) {
				value += defaults.timeIncrements;
				
				// If decrement button is disabled, enable it
				var decBtn = item.querySelector('.ci-dec[disabled]');
				if (decBtn) {
					decBtn.removeAttribute('disabled');
				}
			}
			
			// Update config value and display it
			this.config[configName] = value;
			item.querySelector('.ci-value').textContent = this._numToTime(value);
		},
		
		_onBooleanConfigItem: function (item, evt) {
			var elem = evt.target;
			if (!elem || elem.nodeName !== 'BUTTON') {
				return;
			}
			
			elem.blur();
			var configName = item.dataset.name;
			var value = elem.classList.contains('ci-true');
			
			// Update config value and display it
			this.config[configName] = value;
			elem.classList.add('btn_pressed');
			item.querySelector('.ci-' + !value).classList.remove('btn_pressed');
		},
		
		getConfig: function () {
			return this.config;
		}
		
	};
	
	return ConfigPanel;
	
});
