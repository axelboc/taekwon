
define([
	'minpubsub',
	'handlebars',
	'../io'

], function (PubSub, Handlebars, IO) {
	
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
		
		invalidName: function () {
			// Reset field
			this.field.value = "";
			// Shake field
			this._shake(this.field);
		},
		
		_onNameField: function (evt) {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
				var name = this.field.value;
				if (name.length > 0) {
					this.field.blur();
					console.log("Sending identification (name=\"" + name + "\")");
					IO.sendId(name);
				} else {
					this.invalidName();
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
