
/**
 * Judge
 */
define(['minpubsub'], function (PubSub) {
	
	function Judge() {
		
	}
	
	Judge.prototype = {
		
	};
	
	/**
	 * Wrap publish function
	 */
	function publish(subTopic) {
		PubSub.publish('judge.' + subTopic, [].slice.call(arguments, 1));
	}
	
	// Debug errors
	PubSub.subscribe('judge.error', function (error) {
		console.log(error);
	});
	
	
	return Judge;
	
});
