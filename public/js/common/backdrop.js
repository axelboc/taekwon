
define([
	'./helpers'

], function (Helpers) {
	
	function Backdrop() {
		this.root = document.getElementById('backdrop');
		this.text = this.root.querySelector('.bdp-text');
		this.subtext = this.root.querySelector('.bdp-subtext');
	}
	
	Backdrop.prototype.update = function (text, subtext, visible) {
		this.text.textContent = text;
		this.subtext.textContent = subtext;
		this.root.classList.toggle('hidden', !visible);
	};
	
	Backdrop.prototype.hide = function () {
		this.root.classList.add('hidden');
	};
		
	return Backdrop;
	
});
