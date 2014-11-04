
define([
	'minpubsub',
	'handlebars'

], function (PubSub, Handlebars) {
	
	function Backdrop() {
		this.root = document.getElementById('backdrop');
		this.text = this.root.querySelector('.bdp-text');
		this.subtext = this.root.querySelector('.bdp-subtext');
	}
	
	Backdrop.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('backdrop.' + subTopic, [].slice.call(arguments, 1));
		},
		
		show: function (text, subtext) {
			this.text.textContent = text;
			this.subtext.textContent = subtext;
			this.root.classList.remove('hidden');
		},
		
		hide: function () {
			this.root.classList.add('hidden');
		}
		
	};
	
	return Backdrop;
	
});
