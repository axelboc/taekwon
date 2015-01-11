
define([
	'minpubsub',
	'../../common/helpers',
	'../io'

], function (PubSub, Helpers, IO) {
	
	function PwdView() {
		this.root = document.getElementById('pwd');
		
		this.instr = this.root.querySelector('.pwd-instr');
		this.field = this.root.querySelector('.pwd-field');
		this.field.addEventListener('keypress', this._onPwdField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.pwd-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				identify: this._onIdentify,
				idSuccess: this._onIdSuccess,
				idFail: this._onIdFail
			}
		});
	}
	
	PwdView.prototype._publish = function (subTopic) {
		PubSub.publish('pwdView.' + subTopic, [].slice.call(arguments, 1));
	};
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	PwdView.prototype._onIdentify = function () {
		console.log("Server waiting for identification");
		
		// HACK: set focus on field
		setTimeout(function () {
			this.field.focus();
		}.bind(this), 100);
	};

	PwdView.prototype._onIdSuccess = function() {
		console.log("Identification succeeded");
		this.field.blur();
	};

	PwdView.prototype._onIdFail = function () {
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

	PwdView.prototype._onPwdField = function (evt) {
		// If Enter key was pressed...
		if (evt.which === 13 || evt.keyCode === 13) {
			var pwd = this.field.value;
			IO.sendId(pwd);
			console.log("> Identification sent (pwd=\"" + pwd + "\")");
		}
	};
	
	return PwdView;
	
});
