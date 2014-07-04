
/**
 * Judge
 */
define(['minpubsub'], function (PubSub) {
	
	function Judge() {
		
	}
	
	Judge.prototype = {
		
		publish: function (subTopic) {
			PubSub.publish('judge.' + subTopic, [].slice.call(arguments, 1));
		}
		
	};
	
	return Judge;
	
});
