
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
		
		// Use event delegation on configuration items
		[].forEach.call(this.root.querySelectorAll('.config-item'), function (item) {
			var type = item.dataset.type;
			type = type.charAt(0).toUpperCase() + type.slice(1);
			item.addEventListener('click', this['_on' + type + 'ConfigItem'].bind(this, item));
		}, this);
		
		// TODO: Update view to show default configuration values
		// TODO: Remember to enable disabled buttons
		this._updateAll();
	}
	
	ConfigPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('configPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_numToTime: function (num) {
			var sec = num % 60;
			return Math.floor(num / 60) + ":" + (sec < 10 ? '0' : '') + sec;
		},
		
		_updateAll: function () {
			
		},
		
		_onTimeConfigItem: function (item, evt) {
			var elem = evt.target;
			if (!elem || elem.nodeName !== 'BUTTON') {
				return;
			}
			
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
		
		_onDualConfigItem: function (item, evt) {
			var elem = evt.target;
			if (elem.classList.contains('ci-first')) {
				
			} else if (elem.classList.contains('ci-second')) {
				
			}
		},
		
		getConfig: function () {
			return this.config;
		}
		
	};
	
	return ConfigPanel;
	
});
