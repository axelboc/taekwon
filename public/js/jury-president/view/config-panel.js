
define(['minpubsub', '../../common/helpers'], function (PubSub, Helpers) {
	
	function ConfigPanel(defaults) {
		// Copy default match configuration into model
		this.model = Helpers.shallowCopy(defaults);
		
		// Retrieve DOM elements
		this.root = document.getElementById('config-panel');
		
		// Update view to show default configuration values
		this._update();
	}
	
	ConfigPanel.prototype = {
		
		_update: function () {
			
		},
		
		getConfig: function () {
			return Helpers.shallowCopy(this.model);
		}
		
	};
	
	return ConfigPanel;
	
});
