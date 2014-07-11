
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
		}
		
	};
	
});
