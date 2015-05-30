
define([
	'../../common/helpers'

], function (Helpers) {
	
	function PwdView(io) {
		this.root = document.getElementById('pwd');
		
		this.instr = this.root.querySelector('.pwd-instr');
		this.field = this.root.querySelector('.pwd-field');
		this.field.addEventListener('keypress', this.onPwdField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.pwd-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(io, null, [
			'identify',
			'idSuccess',
			'idFail'
		], this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	PwdView.prototype.onIdentify = function onIdentify() {
		console.log("Server waiting for identification");
		
		// HACK: set focus on field
		setTimeout(function () {
			this.field.focus();
		}.bind(this), 100);
	};

	PwdView.prototype.onIdSuccess = function onIdSuccess() {
		console.log("Identification succeeded");
		this.field.blur();
	};

	PwdView.prototype.onIdFail = function onIdFail() {
		console.log("Identification failed");
		
		// Update instructions
		this.instr.textContent = this.instr.textContent.replace("required", "incorrect");

		// Reset and shake field
		this.field.value = "";
		Helpers.shake(this.field);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */

	PwdView.prototype.onPwdField = function onPwdField(evt) {
		// If Enter key was pressed...
		if (evt.which === 13 || evt.keyCode === 13) {
			var pwd = this.field.value;
			IO.sendId(pwd);
			console.log("> Identification sent (pwd=\"" + pwd + "\")");
		}
	};
	
	return PwdView;
	
});
