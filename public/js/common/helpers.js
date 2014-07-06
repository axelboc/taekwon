
define(['minpubsub'], function (PubSub) {
	
	return {
		
		/**
		 * Subscribe to events by topic.
		 * events = {
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
		}
		
	};
	
});
