
define(['minpubsub'], function (PubSub) {
	
	function Judge(id, name, authorised, connected) {
		this.id = id;
		this.name = name;
		this.connected = connected;
		this.authorised = authorised;
		
		this._publish('initialised', this);
	}
	
	Judge.prototype = {
		
		_publish: function (subTopic) {
			// Pass the slot index of the judge with any event
			var args = [].slice.call(arguments, 0);
			args[0] = this.id;
			
			PubSub.publish('judge.' + subTopic, args);
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
