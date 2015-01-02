
define([
	'minpubsub',
	'../../common/helpers',
	'../io'

], function (PubSub, Helpers, IO) {
	
	function PwdView() {
		this.root = document.getElementById('pwd');
		
		// Subscribe to events from server and views
		Helpers.subscribeToEvents(this, {
			io: {
				identify: this._onIdentify,
				idSuccess: this._onIdSuccess,
				idFail: this._onIdFail
			}
		});
		
		this.instr = this.root.querySelector('.pwd-instr');
		this.field = this.root.querySelector('.pwd-field');
		
		this.field.addEventListener('keypress', this._onPwdField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.pwd-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
	}
	
	PwdView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('pwdView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		_onIdentify: function () {
			console.log("Server waiting for identification");
			
			setTimeout(function () {
				this.field.focus();
			}.bind(this), 100);
		},
		
		_onIdSuccess: function() {
			console.log("Identification succeeded");
		},
		
		_onIdFail: function () {
			console.log("Identification failed");
			
			// Reset field
			this.field.value = "";
			// Update instructions
			this.instr.textContent = this.instr.textContent.replace("required", "incorrect");
			// Shake field
			this._shake(this.field);
		},
		
		
		_onPwdField: function (evt) {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
				IO.sendId(this.field.value);
			}
		},
		
		_onShakeEnd: function (evt) {
			// Remove shake class in case another shake animation needs to be performed
			evt.target.classList.remove('shake');
			// Remove listener
			evt.target.removeEventListener('animationend', this._onShakeEnd);
		},

		_shake: function (field) {
			// Listen to end of shake animation
			field.addEventListener('animationend', this._onShakeEnd);
			// Start shake animation
			field.classList.add('shake');
		}
		
	};
	
	return PwdView;
	
});
