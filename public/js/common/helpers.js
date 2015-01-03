
define(['minpubsub'], function (PubSub) {
	
	return {
		
		/**
		 * Subscribe to events, organised by topic.
		 * @param {Object} scope
		 * @param {Object} events
		 */
		subscribeToEvents: function (scope, events) {
			Object.keys(events).forEach(function (topic) {
				var topicEvents = events[topic];
				Object.keys(topicEvents).forEach(function (subTopic) {
					PubSub.subscribe(topic + '.' + subTopic, topicEvents[subTopic].bind(scope));
				});
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
	
});
