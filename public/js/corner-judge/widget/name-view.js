
define([
	'minpubsub',
	'handlebars'

], function (PubSub, Handlebars) {
	
	function NameView() {
		this.root = document.getElementById('name');
		this.field = this.root.querySelector('.name-field');
		
		// Cancel form submission
		this.root.querySelector('.name-form').addEventListener('submit', function (evt) {
			evt.preventDefault();
		});
		
		this.field.addEventListener('keypress', this._onNameField.bind(this));
	}
	
	NameView.prototype = {
		
		_publish: function (subTopic) {
			PubSub.publish('nameView.' + subTopic, [].slice.call(arguments, 1));
		},
		
		init: function () {
			setTimeout(function () {
				this.field.focus();
			}.bind(this), 100);
		},
		
		_invalidName: function () {
			// Reset field
			this.field.value = "";
			// Shake field
			this._shake(this.field);
		},
		
		_onNameField: function (evt) {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
				if (this.field.value.length > 0) {
					this.field.blur();
					this._publish('nameSubmitted', this.field.value);
				} else {
					this._invalidName();
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
	
	return NameView;
	
});
