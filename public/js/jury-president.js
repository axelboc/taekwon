
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
			socket.on('waitingForId', onWaitingForId);
			socket.on('idSuccess', onIdSuccess);
			socket.on('idFail', onIdFail);
			socket.on('ringAllocations', onRingAllocations);
			socket.on('ringAllocationChanged', onRingAllocationChanged);
			socket.on('ringCreated', onRingCreated);
			socket.on('ringAlreadyExists', onRingAlreadyExists);
			socket.on('authoriseCornerJudge', onAuthoriseCornerJudge);
			socket.on('cornerJudgeStateChanged', onCornerJudgeStateChanged);
			socket.on('matchStarted', onMatchStarted);
		};
		
		
		var onWaitingForId = function () {
			console.log("Server waiting for identification");
			View.showView(Views.PWD);
		};
		
		var sendId = function (password) {
			console.log("Sending identification (password=\"" + password + "\")");
			socket.emit('juryPresident', password);
		};
		
		var onIdSuccess = function (showRingsView) {
			console.log("Identification succeeded");
			View.pwdResult(true);
				
			// If in process of restoring session, rings view may need to be skipped
			if (showRingsView) {
				View.showView(Views.RINGS);
			}
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
		
		var onAuthoriseCornerJudge = function (cornerJudge) {
			console.log("Authorising corner judge (id=" + cornerJudge.id + ")");
			View.onAuthoriseCornerJudge(cornerJudge, false);
		};
		
		var authoriseCornerJudge = function (cornerJudgeId, authorise) {
			if (authorise) {
				console.log("Corner judge accepted (id=" + cornerJudgeId + ")");
				socket.emit('cornerJudgeAccepted', cornerJudgeId);
			} else {
				console.log("Corner judge rejected (id=" + cornerJudgeId + ")");
				socket.emit('cornerJudgeRejected', cornerJudgeId);
			}
		};
			
		var onCornerJudgeStateChanged = function (cornerJudge) {
			console.log("Corner judge state updated (id=" + cornerJudge.id + ", connected=" + cornerJudge.connected + ")");
			View.onCornerJudgeStateChanged(cornerJudge);
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
			authoriseCornerJudge: authoriseCornerJudge,
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
		
		
		var views, pwdAction, pwdInstr, pwdField, ringsList, ringsBtns, startBtn, judgesList, judges, judgesById;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			
			pwdAction = document.getElementById('pwd-action');
			pwdInstr = document.getElementById('pwd-instr');
			pwdField = document.getElementById('pwd-field');
			
			ringsList = document.getElementById('rings-list');
            ringsBtns = ringsList.getElementsByClassName('rings-btn');
			
			judges = [];
			judgesById = {};
			judgesList = document.getElementById('judges-list');
			[].forEach.call(judgesList.getElementsByClassName('judge'), function (item, index) {
				judges[index] = {
					id: null,
					name: null,
					slot: index,
					rootLi: item,
					nameH3: item.getElementsByClassName('judge-name')[0],
					stateSpan: item.getElementsByClassName('judge-state')[0],
					btnsUl: item.getElementsByClassName('judge-btns')[0],
					acceptBtn: item.getElementsByClassName('judge-btn--accept')[0],
					rejectBtn: item.getElementsByClassName('judge-btn--reject')[0]
				};
			});
			
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
        
        var pwdResult = function (correct, showRingsView) {
            if (correct) {
                pwdField.removeEventListener('keypress', onPwdField);
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
		
		var findFreeCornerJudgeSlot = function () {
			var slot = 0;
			while (judges[slot].id !== null && slot < 4) {
				slot++;
			}
			return (slot < 4 ? slot : null);
		};
		
		var onAuthoriseCornerJudge = function (cornerJudge, alreadyAuthorised) {
			// Find next available slot
			var slot = findFreeCornerJudgeSlot();
			if (slot !== null) {
				var judge = judges[slot];
				judge.id = cornerJudge.id;
				judgesById[judge.id] = judge;
				judge.name = cornerJudge.name;
				
				// Set name
				judge.nameH3.textContent = cornerJudge.name;
				// Show/hide accept/reject buttons
				judge.btnsUl.classList.toggle("hidden", alreadyAuthorised);
				
				if (alreadyAuthorised) {
					return judge;
				} else {
					// Hide state span
					judge.stateSpan.classList.add("hidden");

					// Listen to jury president's decision
					judge.acceptFn = onJudgeBtn.bind(null, judge, true);
					judge.rejectFn = onJudgeBtn.bind(null, judge, false);
					judge.acceptBtn.addEventListener('click', judge.acceptFn);
					judge.rejectBtn.addEventListener('click', judge.rejectFn);
				}
			}
		};
		
		var onJudgeBtn = function (judge, accept) {
			IO.authoriseCornerJudge(judge.id, accept);
			
			// Hide buttons
			judge.btnsUl.classList.add("hidden");
			
			// Remove listeners
			judge.acceptBtn.removeEventListener('click', judge.acceptFn);
			judge.rejectBtn.removeEventListener('click', judge.rejectFn);
			judge.acceptFn = null;
			judge.rejectFn = null;
			
			if (!accept) {
				judge.nameH3.textContent = "Judge #" + (judge.slot + 1);
				judge.stateSpan.classList.remove("hidden");
				
				delete judgesById[judge.id];
				judge.id = null;
				judge.name = null;
			}
		};
		
		var onCornerJudgeStateChanged = function (cornerJudge) {
			// Retrieve judge from ID
			var judge = judgesById[cornerJudge.id];
			
			if (!judge) {
				// Dealing with reconnection of jury president
				judge = onAuthoriseCornerJudge(cornerJudge, true);
			}
			
			if (cornerJudge.connected) {
				// Set name and hide connection lost message
				judge.nameH3.textContent = cornerJudge.name;
				judge.stateSpan.classList.add("hidden");
			} else {
				// Show connection lost message
				judge.stateSpan.textContent = "Connection lost. Waiting for reconnection...";
				judge.stateSpan.classList.remove("hidden");
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
			onAuthoriseCornerJudge: onAuthoriseCornerJudge,
			onCornerJudgeStateChanged: onCornerJudgeStateChanged,
			showView: showView
		};
		
	}());
	
	IO.init();
	View.init();
    
    // DEBUG
//    setTimeout(function () {
//		IO.sendId('tkd')
//	}, 200);
	
});
