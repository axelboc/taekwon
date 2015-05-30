
define(function () {
	
	var Helpers = {
		
		/**
		 * Subscribe to inbound IO events.
		 * If a namespace is provided, each event is mapped to a function in the scope with the same name.
		 * Otherwise, each event is mapped to a function with the same name, prefixed with 'on'
		 * (e.g. 'identify' => `onIdentify`)
		 * @param {IO} io
		 * @param {String} namespace - `null` to listen for global events
		 * @param {Array} events
		 * @param {Object} scope
		 */
		subscribeToEvents: function (io, namespace, events, scope) {
			namespace = namespace ? namespace + '.' : '';
			Object.keys(events).forEach(function (evt) {
				var funcName = namespace ? evt : 'on' + evt.charAt(0).toUpperCase() + evt.slice(1);
				io.on(namespace + evt, scope[funcName].bind(scope));
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
