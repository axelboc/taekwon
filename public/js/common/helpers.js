
define(function () {
	
	var Helpers = {
		
		/**
		 * Subscribe to inbound IO events for a given namespace.
		 * Each event is mapped to a function with the same name in the scope.
		 * @param {IO} io
		 * @param {String} namespace
		 * @param {Array} events
		 * @param {Object} scope
		 */
		subscribeToEvents: function (io, namespace, events, scope) {
			Object.keys(events).forEach(function (evt) {
				io.on(namespace + '.' + event, scope[evt].bind(scope));
			}, this);
		},
		
		/**
		 * Shake a DOM element (e.g. a text field).
		 * @param {HTMLElement} elem
		 */
		shake: function (elem) {
			var onShakeEnd = function (evt) {
				// Remove shake class in case another shake animation needs to be performed
				elem.classList.remove('shake');
				// Remove listener
				elem.removeEventListener('animationend', onShakeEnd);
			};

			// Listen to end of shake animation
			elem.addEventListener('animationend', onShakeEnd);
			// Start shake animation
			elem.classList.add('shake');
		},
		
		/**
		 * Enable/disable button.
		 * @param {HTMLButtonElement} btn
		 * @param {Boolean} enable
		 */
		enableBtn: function (btn, enable) {
			if (enable) {
				btn.removeAttribute('disabled');
			} else {
				btn.setAttribute('disabled', 'disabled');
			}
		}
		
	};
	
	return Helpers;
	
});
