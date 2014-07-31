
// TODO: combine rejection events (ring is full, not authorised, match in progress, does not exist)
define([
	'minpubsub',
	'../common/helpers',
	'./io',
	'./widget/name-view',
	'../common/ring-list-view',
	'./widget/round-view'

], function (PubSub, Helpers, IO, NameView, RingListView, RoundView) {
	
	function Controller() {
		// Initialise socket connection with server
		IO.init();
		
		// Subscribe to events
		Helpers.subscribeToEvents(this, {
			io: {
				waitingForId: this._onWaitingForId,
				idSuccess: this._onIdSuccess,
				ringAllocations: this._onRingAllocations,
				ringAllocationChanged: this._onRingAllocationChanged,
				ringJoined: this._onRingJoined,
				ringNotJoined: this._onRingNotJoined,
				ringDoesNotExist: this._onRingDoesNotExist,
				ringIsFull: this._onRingIsFull,
				matchInProgress: this._onMatchInProgress,
				juryPresidentStateChanged: this._onJuryPresidentStateChanged,
				scoringStateChanged: this._onScoringStateChanged,
				removedFromRing: this._onRemovedFromRing,
				restoreSession: this._onRestoreSession
			},
			nameView: {
				nameSubmitted: this._onNameSubmitted
			},
			ringListView: {
				ringSelected: this._onRingSelected
			},
			roundView: {
				score: this._onScore
			}
		});
		
		// Flags
		this.isJPConnected = false;
		this.isScoringEnabled = false;
		
		// Initialise views
		this.nameView = new NameView();
		this.ringListView = new RingListView();
		// Authorisation view doesn't need to be defined as a separate module
		this.authorisationView = {
			root: document.getElementById('authorisation')
		};
		this.roundView = new RoundView();
		
		// Retrieve backdrop elements
		this.backdropWrap = document.getElementById('backdrop-wrap');
		this.disconnectedBackdrop = document.getElementById('disconnected-backdrop');
		this.waitingBackdrop = document.getElementById('waiting-backdrop');
	}
	
	Controller.prototype = {

		_swapView: function(oldView, newView) {
			newView.root.classList.remove('hidden');
			if (oldView) {
				oldView.root.classList.add('hidden');
			}
		},

		_updateBackdrops: function() {
			// Toggle backdrops
			this.disconnectedBackdrop.classList.toggle('hidden', this.isJPConnected);
			this.waitingBackdrop.classList.toggle('hidden', !this.isJPConnected || this.isScoringEnabled);

			// Determine whether backdrop wrapper should be shown or hidden
			var hideWrapper = this.roundView.root.classList.contains('hidden') 
					|| this.isJPConnected
					&& (!this.isJPConnected || this.isScoringEnabled);
			
			// Toggle backdrop wrapper
			this.backdropWrap.classList.toggle('hidden', hideWrapper);
		},
		
		_onWaitingForId: function() {
			console.log("Server waiting for identification");
			this._swapView(null, this.nameView);
			this.nameView.init();
		},

		_onNameSubmitted: function(name) {
			console.log("Sending identification (name=\"" + name + "\")");
			IO.sendId(name);
		},

		_onIdSuccess: function() {
			console.log("Identification succeeded");
		},

		_onRingAllocations: function(allocations) {
			console.log("Ring allocations received (count=\"" + allocations.length + "\")");
			this.ringListView.init(allocations);
			this._swapView(this.nameView, this.ringListView);
		},

		_onRingAllocationChanged: function(allocation) {
			console.log("Ring allocation changed (index=\"" + allocation.index + "\")");
			this.ringListView.updateRingBtn(allocation.index - 1, allocation.allocated);
		},

		_onRingSelected: function(index) {
			console.log("Joining ring (index=" + index + ")");
			IO.joinRing(index);
			console.log("Waiting for authorisation to join ring");
			this._swapView(this.ringListView, this.authorisationView);
		},

		_onRingJoined: function(data) {
			console.log("Joined ring (index=" + data.ringIndex + ")");

			// Show round view
			this._swapView(this.authorisationView, this.roundView);

			// Update scoring and JP states and toggle backdrops
			this.isScoringEnabled = data.scoringEnabled;
			this.isJPConnected = data.jpConnected;
			this._updateBackdrops();
			
			// Update page title to show ring number
			document.title = "Corner Judge | Ring " + (data.ringIndex + 1);
		},

		_onRingNotJoined: function(index) {
			console.log("Ring not joined (index=" + index + ")");
			this.ringListView.updateInstr("Not authorised to join ring");
			this._swapView(this.authorisationView, this.ringListView);
		},

		_onRingDoesNotExist: function(index) {
			console.error("Ring does not exist (index=" + index + ")");
			this.ringListView.updateInstr("Sorry, an error occured");
			this._swapView(this.authorisationView, this.ringListView);
		},

		_onRingIsFull: function(index) {
			console.log("Ring is full (index=" + index + ")");
			this.ringListView.updateInstr("Ring is full");
			this._swapView(this.authorisationView, this.ringListView);
		},

		_onMatchInProgress: function(index) {
			console.log("Match in progress (index=" + index + ")");
			this.ringListView.updateInstr("Match in progress");
			this._swapView(this.authorisationView, this.ringListView);
		},

		_onJuryPresidentStateChanged: function(connected) {
			console.log("Jury president " + (connected ? "connected" : "disconnected"));
			this.isJPConnected = connected;
			this._updateBackdrops();
		},

		_onScoringStateChanged: function(enabled) {
			console.log("Scoring " + (enabled ? "enabled" : "disabled"));
			this.isScoringEnabled = enabled;
			this._updateBackdrops();
		},

		_onScore: function(competitor, points) {
			console.log("Scoring " + points + " points for " + competitor);
			IO.score(competitor, points);
		},

		_onRemovedFromRing: function(index) {
			console.log("Ring is full (index=" + index + ")");
			this.ringListView.updateInstr("Removed from ring");
			this._swapView(this.roundView, this.ringListView);
			this._updateBackdrops();
		},

		_onRestoreSession: function(data) {
			console.log("Restoring session");

			// Init ring list view with ring allocation data
			this.ringListView.init(data.ringAllocations);

			// If no ring was joined yet, show ring list view
			if (data.ringIndex === -1) {
				this._swapView(null, this.ringListView);

			// If a ring was joined, but JP had not authorised the request yet, show authorisation view
			} else if (!data.authorised) {
				this._swapView(null, this.authorisationView);

			// If JP was authorised by CJ to join a ring, show round view
			} else {
				this._onRingJoined(data);
			}

			IO.sessionRestored();
		}

	};
	
	return Controller;
	
});
