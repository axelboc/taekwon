
define([
	'./helpers'

], function (Helpers) {
	
	function LoginView(io) {
		this.io = io;
		this.root = document.getElementById('login');
		
		this.instr = this.root.querySelector('.login-instr');
		this.field = this.root.querySelector('.login-field');
		this.field.addEventListener('keypress', this.onField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.login-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(io, 'login', [
			'setInstr',
			'focusField',
			'blurField',
			'shakeResetField'
		], this);
	}
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	LoginView.prototype.setInstr = function setInstr(data) {
		// Update instructions
		this.instr.textContent = data.text;
	};
	
	LoginView.prototype.focusField = function focusField() {
		// HACK: set focus on field
		setTimeout(function () {
			this.field.focus();
		}.bind(this), 100);
	};

	LoginView.prototype.blurField = function blurField() {
		this.field.blur();
	};

	LoginView.prototype.shakeResetField = function shakeResetField() {
		// Reset and shake field
		this.field.value = "";
		Helpers.shake(this.field);
	};
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */

	LoginView.prototype.onField = function onField(evt) {
		// If Enter key was pressed...
		if (evt.which === 13 || evt.keyCode === 13) {
			this.io.send('identification', {
				identity: this.io.identity,
				value: this.field.value
			});
		}
	};
	
	return LoginView;
	
});
