
define([
	'handlebars'

], function (Handlebars) {
	
	function Backdrop() {
		this.root = document.getElementById('backdrop');
		this.text = this.root.querySelector('.bdp-text');
		this.subtext = this.root.querySelector('.bdp-subtext');
	}
	
	Backdrop.prototype = {
		
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
