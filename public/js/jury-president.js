
document.addEventListener("DOMContentLoaded", function domReady() {
	"use strict";
	
	/**
	 * 'IO' module for everything related to scoket communication.
	 */
	var IO = (function () {
		
		var socket;
		
		var init = function (password) {
			console.log("Connecting to server");
			socket = io.connect();
			
			// Bind events
			socket.on('idYourself', onIdYourself.bind(null, password));
			socket.on('idSuccess', onIdSuccess);
			socket.on('disconnect', onDisconnect);
			socket.on('ringCreated', onRingCreated);
			socket.on('ringAlreadyExists', onRingAlreadyExists);
			socket.on('authoriseCornerJudge', onAuthoriseCornerJudge);
			socket.on('matchStarted', onMatchStarted);
		};
		
		
		var onIdYourself = function (password) {
			console.log("Identification request");
			console.log("Sending identification (password=\"" + password + "\")");
			socket.emit('juryPresident', password);
		};
		
		var onIdSuccess = function () {
			console.log("Identification succeeded");
			View.showView(Views.RINGID);
		};
		
		var onDisconnect = function () {
			console.log("Identification failed");
			window.location.reload();
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
		
		
		var views, pwdField, pwdBtn, ringidField, ringidBtn, startMatchBtn;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			pwdField = document.getElementById('pwd-field');
			pwdBtn = document.getElementById('pwd-btn');
			ringidField = document.getElementById('ringid-field');
			ringidBtn = document.getElementById('ringid-btn');
			startMatchBtn = document.getElementById('start-match-btn');
		};
		
		var bindEvents = function () {
			pwdBtn.addEventListener('click', onPwdBtn);
			ringidBtn.addEventListener('click', onRingidBtn);
			startMatchBtn.addEventListener('click', onStartMatchBtn);
		};
		
		
		var onPwdBtn = function () {
			if (pwdField.value.length > 0) {
				// Initialise socket connection (pass name for identification)
				IO.init(pwdField.value);
			} else {
				alert("Please enter password.");
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
		
		
		return {
			init: init,
			showView: showView
		};
		
	}());
	
	
	View.init();
	
});
