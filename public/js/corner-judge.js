
document.addEventListener("DOMContentLoaded", function domReady() {
	"use strict";
	
	/**
	 * 'IO' module for everything related to scoket communication.
	 */
	var IO = (function () {
		
		var socket;
		
		var init = function (name) {
			console.log("Connecting to server");
			socket = io.connect();
			
			// Bind events
			socket.on('idSuccess', onIdSuccess);
			socket.on('ringAllocations', onRingAllocations);
			socket.on('ringAllocationChanged', onRingAllocationChanged);
			socket.on('ringJoined', onRingJoined);
			socket.on('ringDoesNotExist', onRingDoesNotExist);
			socket.on('ringIsFull', onRingIsFull);
			socket.on('matchCreated', onMatchCreated);
		};
		
		
		var sendId = function (name) {
			console.log("Sending identification (name=\"" + name + "\")");
			socket.emit('cornerJudge', name);
		};
		
		var onIdSuccess = function () {
			console.log("Identification succeeded");
			View.showView(Views.RINGS);
		};
		
		var onRingAllocations = function (allocations) {
			console.log("Ring allocations: " + allocations);
			View.onRingAllocations(allocations);
		};
		
		var onRingAllocationChanged = function (allocation) {
			console.log("Ring allocation changed (allocation=\"" + allocation + "\")");
			View.onRingAllocationChanged(allocation, allocation.index - 1);
		};
		
		var joinRing = function (ringId) {
			console.log("Joining ring (id=" + ringId + ")");
			socket.emit('joinRing', ringId);
		};
		
		var onRingJoined = function (ringId) {
			console.log("Joined ring (id=" + ringId + ")");
			View.showView(Views.ROUND);
		};
		
		var onRingDoesNotExist = function (ringId) {
			console.log("Ring does not exist (id=" + ringId + ")");
		};
		
		var onRingIsFull = function (ringId) {
			console.log("Ring is full (id=" + ringId + ")");
		};
		
		var onMatchCreated = function (matchId) {
			console.log("Match created (id=" + matchId + ")");
		};
		
		var score = function (points, competitor) {
			console.log("Scoring " + points + " points for " + competitor);
			socket.emit('score', {
				competitor: competitor,
				points: points
			});
		};
		
		
		return {
			init: init,
            sendId: sendId,
			joinRing: joinRing,
			score: score
		};
		
	}());
	
	
	/**
	 * Enum of all the views
	 */
	var Views = {
		NAME: 'name-view',
		RINGS: 'rings-view',
		ROUND: 'round-view'
	};
	
	/**
	 * Enum of the competitors
	 */
	var Competitors = {
		HONG: 'hong',
		CHONG: 'chong'
	};
	
	
	/**
	 * 'View' module for everything related to the interface.
	 */
	var View = (function () {
		
		var init = function () {
			cacheElements();
			bindEvents();
			
			// Initialise FastClick to remove 300ms delay on mobile devices
			FastClick.attach(document.body);
		};
		
		
		var views, nameField, ringsList, ringsBtns, scoreOneBtn;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			nameField = document.getElementById('name-field');
			ringsList = document.getElementById('rings-list');
            ringsBtns = ringsList.getElementsByClassName('rings-btn');
			scoreOneBtn = document.getElementById('score1');
		};
		
		var bindEvents = function () {
			nameField.addEventListener('keypress', onNameField);
			scoreOneBtn.addEventListener('click', onScoreBtn.bind(null, Competitors.HONG, 1));
		};
		
		
		var onNameField = function (evt) {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
                // Check name field is not empty
				if (nameField.value.length > 0) {
                    // Remove event listener
                    nameField.removeEventListener('keypress', onNameField);
					// Send identification to server
					IO.sendId(nameField.value);
				} else {
                    // Shake field
                    shakeField(nameField);
                }
			}
		};
		
		var onRingAllocations = function (allocations) {
            allocations.forEach(onRingAllocationChanged);
		};
		
		var onRingAllocationChanged = function (allocation, index) {
            console.log(index);
            if (allocation.allocated) {
                ringsBtns[index].removeAttribute("disabled");
            } else {
                ringsBtns[index].setAttribute("disabled", "disabled");
            }
		};
        
		var onScoreBtn = function (competitor, points) {
			IO.score(competitor, points);
		};
		
		
		var showView = function (view) {
			// Hide all views
			[].forEach.call(views, function (v) {
				if (v.id === view) {
					v.classList.remove("hidden");
				} else {
					v.classList.add("hidden");
				}
			});
		};
        
		var onShakeEnd = function (evt) {
            // Remove shake class in case another shake animation needs to be performed
			evt.target.classList.remove("shake");
            // Remove listener
			evt.target.removeEventListener('animationend', onShakeEnd);
		};
		
		var shakeField = function (field) {
            // Listen to end of shake animation
            field.addEventListener('animationend', onShakeEnd);
            // Start shake animation
            field.classList.add("shake");
		};
		
		
		return {
			init: init,
			onRingAllocations: onRingAllocations,
			onRingAllocationChanged: onRingAllocationChanged,
			showView: showView
		};
		
	}());
	
	
    IO.init();
	View.init();
	
});
