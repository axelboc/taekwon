
define(['minpubsub'], function (PubSub) {
	
	function Judge(slotIndex, id, name, authorised, connected) {
		this.slotIndex = slotIndex;
		this.id = id;
		this.name = name;
		this.connected = connected;
		this.authorised = authorised;
	}
	
	Judge.prototype = {
		
		_publish: function (subTopic) {
			// Pass the slot index of the judge with any event
			PubSub.publish('judge.' + this.slotIndex + '.' + subTopic, [].slice.call(arguments, 1));
		},
		
		authorise: function () {
			this.authorised = true;
			this._publish('authorised');
		},
		
		setConnectionState: function (connected) {
			this.connected = connected;
			this._publish('connectionStateChanged', connected);
		}
		
	};
	
	return Judge;
	
});
