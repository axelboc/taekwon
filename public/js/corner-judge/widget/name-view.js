
define([
	'minpubsub',
	'../../common/helpers',
	'../io'

], function (PubSub, Helpers, IO) {
	
	function NameView() {
		this.root = document.getElementById('name');
		
		this.field = this.root.querySelector('.name-field');
		this.field.addEventListener('keypress', this._onNameField.bind(this));
		
		// Cancel form submission
		this.root.querySelector('.name-form').addEventListener('submit', function (evt) {
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
	
	NameView.prototype._publish = function (subTopic) {
		PubSub.publish('nameView.' + subTopic, [].slice.call(arguments, 1));
	};
	
	
	/* ==================================================
	 * IO events
	 * ================================================== */
	
	NameView.prototype._onIdentify = function() {
		console.log("Server waiting for identification");
		
		// HACK: set focus on field
		setTimeout(function () {
			this.field.focus();
		}.bind(this), 100);
	}

	NameView.prototype._onIdSuccess = function() {
		console.log("Identification succeeded");
		this.field.blur();
	}

	NameView.prototype._onIdFail = function() {
		console.log("Identification failed");

		// Reset and shake field
		this.field.value = "";
		Helpers.shake(this.field);
	}
	
	
	/* ==================================================
	 * UI events
	 * ================================================== */
	
	NameView.prototype._onNameField = function (evt) {
		// If enter key was pressed...
		if (evt.which === 13 || evt.keyCode === 13) {
			var name = this.field.value;
			IO.sendId(name);
			console.log("> Identification sent (name=\"" + name + "\")");
		}
	}
	
	return NameView;
	
});
