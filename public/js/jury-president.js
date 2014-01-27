
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
		
		var createRing = function (ringId) {
			console.log("Creating ring (id=" + ringId + ")");
			socket.emit('createRing', ringId);
		};
		
		var onRingCreated = function (ringId) {
			console.log("Ring created (id=" + ringId + ")");
			View.showView(Views.START_MATCH);
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
		RINGID: 'ringid-view',
		START_MATCH: 'start-match-view'
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
		};
		
		
		var views, pwdAction, pwdInstr, pwdField, ringidField, ringidBtn, startMatchBtn;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			pwdAction = document.getElementById('pwd-action');
			pwdInstr = document.getElementById('pwd-instr');
			pwdField = document.getElementById('pwd-field');
			ringidField = document.getElementById('ringid-field');
			ringidBtn = document.getElementById('ringid-btn');
			startMatchBtn = document.getElementById('start-match-btn');
		};
		
		var bindEvents = function () {
			pwdField.addEventListener('keypress', onPwdField);
			ringidBtn.addEventListener('click', onRingidBtn);
			startMatchBtn.addEventListener('click', onStartMatchBtn);
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
                showView(Views.RINGID);
            } else {
                // Reset field
                pwdField.value = "";
                // Update instructions
                pwdInstr.textContent = pwdInstr.textContent.replace("required", "incorrect");
                // Shake field
                shakeField(pwdField);
            }
        };
		
		var onRingidBtn = function () {
			if (ringidField.value.length > 0) {
				IO.createRing(ringidField.value);
			} else {
				alert("Please enter your ring number.");
			}
		};
		
		var onStartMatchBtn = function () {
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
			showView: showView
		};
		
	}());
	
	IO.init();
	View.init();
	
});
