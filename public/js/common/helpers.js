
define(['minpubsub'], function (PubSub) {
	
	return {
		
		/**
		 * Subscribe to events by topic.
		 * this.events = {
		 *     topic: {
		 *         subTopic: handlerFn
		 *     }
		 * } 
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
		 * Return a shallow copy of an object.
		 */
		shallowCopy: function (obj) {
			var copy = {};
			Object.keys(obj).forEach(function (key) {
				copy[key] = obj[key];
			});
			return copy;
		},
		
		/**
		 * Enable/disable button
		 */
		enableBtn: function (btn, enable) {
			if (enable) {
				btn.removeAttribute('disabled');
			} else {
				btn.setAttribute('disabled', 'disabled');
			}
		},
		
		/**
		 *  Cross-browser function to launch full-screen (http://davidwalsh.name/fullscreen)
		 */
		fullScreen: function (elem) {
			if(elem.requestFullscreen) {
				elem.requestFullscreen();
			} else if(elem.mozRequestFullScreen) {
				elem.mozRequestFullScreen();
			} else if(elem.webkitRequestFullscreen) {
				elem.webkitRequestFullscreen();
			} else if(elem.msRequestFullscreen) {
				elem.msRequestFullscreen();
			}
		}
		
	};
	
});
