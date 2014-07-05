
define(['minpubsub'], function (PubSub) {
	
	function Judge(id, name, authorised) {
		this.id = id;
		this.name = name;false
		this.authorised = authorised
	}
	
	Judge.prototype = {
		
		_publish: function (subTopic) {
			// Always pass the ID of the judge when publishing an event
			PubSub.publish('judge.' + subTopic, [this.id].concat([].slice.call(arguments, 1)));
		},
		
		authorise: function () {
			this.authorised = true;
			this._publish('authorised');
		},
		
		reject: function () {
			this.authorised = false;
			this._publish('rejected');
		},
		
		disconnect: function () {
			this._publish('disconnected');
		}
		
	};
	
	return Judge;
	
});
