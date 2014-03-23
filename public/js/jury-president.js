
document.addEventListener("DOMContentLoaded", function domReady() {
	"use strict";
	
	/**
	 * 'IO' module for everything related to scoket communication.
	 */
	var IO = (function () {
		
		var socket;
		
		var init = function () {
			console.log("Connecting to server");
			socket = io.connect();
			
			// Bind events
			socket.on('idSuccess', onIdSuccess);
			socket.on('idFail', onIdFail);
			socket.on('ringAllocations', onRingAllocations);
			socket.on('ringAllocationChanged', onRingAllocationChanged);
			socket.on('ringCreated', onRingCreated);
			socket.on('ringAlreadyExists', onRingAlreadyExists);
			socket.on('authoriseCornerJudge', onAuthoriseCornerJudge);
			socket.on('matchStarted', onMatchStarted);
		};
		
		
		var sendId = function (password) {
			console.log("Sending identification (password=\"" + password + "\")");
			socket.emit('juryPresident', password);
		};
		
		var onIdSuccess = function () {
			console.log("Identification succeeded");
			View.pwdResult(true);
		};
		
		var onIdFail = function () {
			console.log("Identification failed");
			View.pwdResult(false);
		};
		
		var onRingAllocations = function (allocations) {
			console.log("Ring allocations: " + allocations);
			View.onRingAllocations(allocations);
		};
		
		var onRingAllocationChanged = function (allocation) {
			console.log("Ring allocation changed (allocation=\"" + allocation + "\")");
			View.onRingAllocationChanged(allocation, allocation.index - 1);
		};
		
		var createRing = function (index) {
			console.log("Creating ring (index=" + index + ")");
			socket.emit('createRing', index);
		};
		
		var onRingCreated = function (ringId) {
			console.log("Ring created (id=" + ringId + ")");
			View.showView(Views.MATCH);
		};
		
		var onRingAlreadyExists = function (ringId) {
			console.log("Ring already exists (id=" + ringId + ")");
		};
		
		var onAuthoriseCornerJudge = function (cornerJudgeId) {
			console.log("Authorising corner judge (id=" + cornerJudgeId + ")");
			socket.emit('cornerJudgeAuthorised', cornerJudgeId);
		};
		
		var startMatch = function () {
			console.log("Starting new match");
			socket.emit('startMatch');
		};
		
		var onMatchStarted = function (matchId) {
			console.log("Match started (id=" + matchId + ")");
		};
	
		
		return {
			init: init,
			sendId: sendId,
			createRing: createRing,
			startMatch: startMatch
		};
		
	}());
	
	
	/**
	 * Enum of all the views
	 */
	var Views = {
		PWD: 'pwd-view',
		RINGS: 'rings-view',
		MATCH: 'match-view'
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
		
		
		var views, pwdAction, pwdInstr, pwdField, ringsList, ringsBtns, startBtn;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			pwdAction = document.getElementById('pwd-action');
			pwdInstr = document.getElementById('pwd-instr');
			pwdField = document.getElementById('pwd-field');
			ringsList = document.getElementById('rings-list');
            ringsBtns = ringsList.getElementsByClassName('rings-btn');
			startBtn = document.getElementById('start-btn');
		};
		
		var bindEvents = function () {
			pwdField.addEventListener('keypress', onPwdField);
            [].forEach.call(ringsBtns, function (item, index) {
                item.addEventListener('click', onRingsBtn.bind(null, index));
            });
			startBtn.addEventListener('click', onStartBtn);
		};
		
		var onPwdField = function (evt) {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
				if (pwdField.value.length > 0) {
					// Send identification to server
					IO.sendId(pwdField.value);
				} else {
					pwdResult(false);
				}
			}
		};
        
        var pwdResult = function (correct) {
            if (correct) {
                pwdField.removeEventListener('keypress', onPwdField);
                showView(Views.RINGS);
            } else {
                // Reset field
                pwdField.value = "";
                // Update instructions
                pwdInstr.textContent = pwdInstr.textContent.replace("required", "incorrect");
                // Shake field
                shakeField(pwdField);
            }
        };
		
		var onRingAllocations = function (allocations) {
            allocations.forEach(onRingAllocationChanged);
		};
		
		var onRingAllocationChanged = function (allocation, index) {
            if (allocation.allocated) {
                ringsBtns[index].setAttribute("disabled", "disabled");
            } else {
                ringsBtns[index].removeAttribute("disabled");
            }
		};
		
		var onRingsBtn = function (index, evt) {
            if (!evt.target.hasAttribute("disabled")) {
                IO.createRing(index);
            } else {
                alert("This ring has already been selected by another Jury President.");
            }
		};
		
		var onStartBtn = function () {
			IO.startMatch();
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
            pwdResult: pwdResult,
            onRingAllocations: onRingAllocations,
            onRingAllocationChanged: onRingAllocationChanged,
			showView: showView
		};
		
	}());
	
	IO.init();
	View.init();
    
    // DEBUG
    //IO.sendId('tkd');
	
});
