
define(['./helpers'], function (Helpers) {
	
	function Backdrop(io) {
		this.root = document.getElementById('backdrop');
		this.text = this.root.querySelector('.bdp-text');
		this.subtext = this.root.querySelector('.bdp-subtext');
		
		Helpers.subscribeToEvents(io, 'backdrop', ['update'], this);
	}
	
	Backdrop.prototype.update = function update(data) {
		this.text.textContent = data.text;
		this.subtext.textContent = data.subtext;
		this.root.classList.toggle('hidden', data.visible);
	};
		
	return Backdrop;
	
});
