
define(['minpubsub'], function (PubSub) {
	
	var Helpers = {
		
		/**
		 * Subscribe to events, organised by topic.
		 * @param {Object} scope
		 * @param {Object} events
		 * @param {String} path - for recursion
		 */
		subscribeToEvents: function (scope, events, path) {
			path = path || '';
			Object.keys(events).forEach(function (topic) {
				var event = (path ? path + '.' : '') + topic;
				if (typeof events[topic] === 'function') {
					PubSub.subscribe(event, events[topic].bind(scope));
				} else {
					Helpers.subscribeToEvents(scope, events[topic], event);
				}
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
