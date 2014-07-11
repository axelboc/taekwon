// TODO: determine if this module is still relevant
define(['minpubsub'], function (PubSub) {
	
	function Ring(index) {
		this.index = index;
		
		this.judges = [];
		this.judgeById = {};
	}
	
	Ring.prototype = {
		
		// TODO: subscribe to errors in main module
		_publish: function (subTopic) {
			PubSub.publish('ring.' + subTopic, [].slice.call(arguments, 1));
		},
		
		newJudge: function (id, name) {
			var judge = new Judge(id, name);
			this.judges.push(judge);
			this.judgeById[judge.id] = judge;
			return judge;
		}
		
	};
	
	return Ring;
	
});
