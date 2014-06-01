
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
			socket.on('waitingForId', onWaitingForId);
			socket.on('idSuccess', onIdSuccess);
			socket.on('ringAllocations', onRingAllocations);
			socket.on('ringAllocationChanged', onRingAllocationChanged);
			socket.on('waitingForAuthorisation', onWaitingForAuthorisation);
			socket.on('ringJoined', onRingJoined);
			socket.on('ringNotJoined', onRingNotJoined);
			socket.on('ringDoesNotExist', onRingDoesNotExist);
			socket.on('ringIsFull', onRingIsFull);
			socket.on('juryPresidentStateChanged', onJuryPresidentStateChanged);
			socket.on('matchStateChanged', onMatchStateChanged);
		};
		
		
		var onWaitingForId = function () {
			console.log("Server waiting for identification");
			View.showView(Views.NAME);
		};
		
		var sendId = function (name) {
			console.log("Sending identification (name=\"" + name + "\")");
			socket.emit('cornerJudge', name);
		};
		
		var onIdSuccess = function (showRingsView) {
			console.log("Identification succeeded");
			
			// If in process of restoring session, rings view may need to be skipped
			if (showRingsView) {
				View.showView(Views.RINGS);
			}
		};
		
		var onRingAllocations = function (allocations) {
			console.log("Ring allocations: " + allocations);
			View.onRingAllocations(allocations);
		};
		
		var onRingAllocationChanged = function (allocation) {
			console.log("Ring allocation changed (allocation=\"" + allocation + "\")");
			View.onRingAllocationChanged(allocation, allocation.index - 1);
		};
		
		var onWaitingForAuthorisation = function () {
			console.log("Waiting for authorisation to join ring");
			View.showView(Views.AUTHORISATION);
		};
		
		var joinRing = function (ringId) {
			console.log("Joining ring (id=" + ringId + ")");
			socket.emit('joinRing', ringId);
			View.showView(Views.AUTHORISATION);
		};
		
		var onRingJoined = function (ringId) {
			console.log("Joined ring (id=" + ringId + ")");
			View.showView(Views.ROUND);
			View.toggleBackdrop(true, Backdrops.WAITING);
		};
		
		var onRingNotJoined = function (ringId) {
			console.log("Ring not joined (id=" + ringId + ")");
			View.ringNotJoined("Not authorised to join ring");
		};
		
		var onRingDoesNotExist = function (ringId) {
			console.log("Ring does not exist (id=" + ringId + ")");
			View.ringNotJoined("Ring does not exist... Wait, that's not quite right. Please contact the administrator.");
		};
		
		var onRingIsFull = function (ringId) {
			console.log("Ring is full (id=" + ringId + ")");
			View.ringNotJoined("Ring is full");
		};
		
		var onJuryPresidentStateChanged = function (connected) {
			console.log("Jury president " + (connected ? "connected" : "disconnected"));
			View.toggleBackdrop(!connected, Backdrops.DISCONNECTED);
		};
		
		var onMatchStateChanged = function (newState) {
			console.log("Match state changed to " + newState);
			View.onMatchStateChanged(newState);
		};
		
		var score = function (competitor, points) {
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
		AUTHORISATION: 'authorisation-view',
		ROUND: 'round-view'
	};
	
	var Backdrops = {
		DISCONNECTED: 'backdrop--disconnected',
		WAITING: 'backdrop--waiting'
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
		
		var state;
		var views, backdropWrap, backdrops, nameField, ringsInstr, ringsList, ringsBtns, scoreBtnsHong, scoreBtnsChong;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			backdropWrap = document.getElementById('backdrop-wrap');
			backdrops = backdropWrap.getElementsByClassName('backdrop');
			nameField = document.getElementById('name-field');
			ringsInstr = document.getElementById('rings-instr');
			ringsList = document.getElementById('rings-list');
            ringsBtns = ringsList.getElementsByClassName('rings-btn');
			scoreBtnsHong = document.querySelectorAll('.score-btns--hong > .score-btn');
			scoreBtnsChong = document.querySelectorAll('.score-btns--chong > .score-btn');
		};
		
		var bindEvents = function () {
			nameField.addEventListener('keypress', onNameField);
			
			[].forEach.call(ringsBtns, function (btn, index) {
                btn.addEventListener('click', onRingsBtn.bind(btn, index));
			});
			
			var bindScoreBtn = function (competitor, btn, index) {
				btn.addEventListener('click', onScoreBtn.bind(btn, competitor, index * -1 + 5));
			};
			
			[].forEach.call(scoreBtnsHong, bindScoreBtn.bind(this, Competitors.HONG)); 
			[].forEach.call(scoreBtnsChong, bindScoreBtn.bind(this, Competitors.CHONG)); 
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
            if (allocation.allocated) {
                ringsBtns[index].removeAttribute("disabled");
            } else {
                ringsBtns[index].setAttribute("disabled", "disabled");
            }
		};
		
		var onRingsBtn = function (index, evt) {
			this.blur();
            if (!this.hasAttribute("disabled")) {
                IO.joinRing(index);
            } else {
                alert("This ring hasn't been created yet.");
            }
		};
		
		var ringNotJoined = function (message) {
			ringsInstr.textContent = message;
			showView(Views.RINGS);
		};
		
		var onMatchStateChanged = function (newState) {
			state = newState;
			toggleBackdrop(state !== 'round', Backdrops.WAITING);
		};
        
		var onScoreBtn = function (competitor, points) {
			if (window.navigator.vibrate) {
				window.navigator.vibrate(100);
			}
			
			IO.score(competitor, points);
		};
		
		
		var showView = function (view) {
			// Hide all views
			[].forEach.call(views, function (v) {
				v.classList.toggle("hidden", !(v.id === view));
			});
		};
		
		var toggleBackdrop = function (show, backdrop) {
			if (!show && backdrop === Backdrops.DISCONNECTED && state !== 'round') {
				// Restore waiting backdrop instead
				show = true;
				backdrop = Backdrops.WAITING;
			}
			
			if (show && backdrop) {
				[].forEach.call(backdrops, function (b) {
					b.classList.toggle("hidden", !b.classList.contains(backdrop));
				});
			}
			
			// Show/hide backdrop wrapper
			backdropWrap.classList.toggle("hidden", !show);
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
			ringNotJoined: ringNotJoined,
			onMatchStateChanged: onMatchStateChanged,
			showView: showView,
			toggleBackdrop: toggleBackdrop
		};
		
	}());
	
	
    IO.init();
	View.init();
	
});
