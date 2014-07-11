
define(['minpubsub', 'handlebars'], function (PubSub, Handlebars) {
	
	function PwdView() {
		this.root = document.getElementById('pwd');
		this.instr = this.root.querySelector('.pwd-instr');
		this.field = this.root.querySelector('.pwd-field');
		
		this.field.addEventListener('keypress', this._onPwdField.bind(this));
	}
	
	PwdView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('pwdView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		init: function () {
			setTimeout(function () {
				this.field.focus();
			}, 100);
		},
		
		invalidPwd: function () {
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
				if (this.field.value.length > 0) {
					this._publish('pwdSubmitted', this.field.value);
				} else {
					this.invalidPwd();
				}
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
