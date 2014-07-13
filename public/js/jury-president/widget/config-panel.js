
define([
	'minpubsub',
	'../../common/helpers'

], function (PubSub, Helpers) {
	
	function ConfigPanel(ring, defaults) {
		this.ring = ring;
		this.config = Helpers.shallowCopy(defaults);
		this.root = document.getElementById('config-panel');
		
		this.newMatchBtn = this.root.querySelector('.match-btn--new');
		this.newMatchBtn.addEventListener('click', this._publish.bind(this, 'newMatchBtn'));
		
		// Update view to show default configuration values
		this._update();
	}
	
	ConfigPanel.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('configPanel.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_numToTime: function (num) {
			return Math.floor(num / 60) + ":" + (num % 60);
		},
		
		_update: function () {
			
		},
		
		getConfig: function () {
			return Helpers.shallowCopy(this.config);
		}
		
	};
	
	return ConfigPanel;
	
});
