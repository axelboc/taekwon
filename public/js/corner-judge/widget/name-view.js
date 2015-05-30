
define([
	'../../common/helpers'

], function (Helpers) {
	
	function NameView(io) {
		this.root = document.getElementById('name');
		
		this.field = this.root.querySelector('.name-field');
		this.field.addEventListener('keypress', this.onNameField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.name-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
		
		// Subscribe to inbound IO events
		Helpers.subscribeToEvents(io, null, [
			'identify',
			'idSuccess',
			'idFail'
		], this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	NameView.prototype.onIdentify = function onIdentify() {
		// HACK: set focus on field
		setTimeout(function () {
			this.field.focus();
		}.bind(this), 100);
	};

	NameView.prototype.onIdSuccess = function onIdSuccess() {
		this.field.blur();
	};

	NameView.prototype.onIdFail = function onIdFail() {
		// Reset and shake field
		this.field.value = "";
		Helpers.shake(this.field);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	NameView.prototype.onNameField = function onNameField(evt) {
		// If enter key was pressed...
		if (evt.which === 13 || evt.keyCode === 13) {
			var name = this.field.value;
			IO.sendId(name);
		}
	};
	
	return NameView;
	
});
