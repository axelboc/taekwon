
define(['minpubsub'], function (PubSub) {
	
	function Ring(index) {
		this.index = index;
		
		this.
	}
	
	Ring.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('match.' + subTopic, [].slice.call(arguments, 1));
		},
		
		newJudge: function (judge) {
			
		}
		
	};
	
	return Ring;
	
});
