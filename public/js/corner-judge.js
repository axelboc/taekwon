
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
			socket.on('idRequest', onIdRequest.bind(null, name));
			socket.on('idSuccess', onIdSuccess);
			socket.on('ringsList', onRingsList);
			socket.on('newRing', onNewRing);
			socket.on('ringJoined', onRingJoined);
			socket.on('ringDoesNotExist', onRingDoesNotExist);
			socket.on('ringIsFull', onRingIsFull);
			socket.on('matchCreated', onMatchCreated);
		};
		
		
		var onIdRequest = function (name) {
			console.log("Identification requested");
			console.log("Sending identification (name=\"" + name + "\")");
			socket.emit('cornerJudge', name);
		};
		
		var onIdSuccess = function () {
			console.log("Identification succeeded");
		};
		
		var onRingsList = function (ringIds) {
			console.log("Available rings: " + ringIds);
			View.updateRingsList(ringIds);
			View.showView(Views.RINGS);
		};
		
		var onNewRing = function (ringId) {
			console.log("New ring available: " + ringId);
			View.pushNewRing(ringId);
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
			joinRing: joinRing,
			score: score
		};
		
	}());
	
	
	/**
	 * Enum of all the views
	 */
	var Views = {
		ID: 'id-view',
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
		
		
		var views, nameField, ringsList, ringIds, scoreOneBtn;
		
		var cacheElements = function () {
			views = document.getElementsByClassName('view');
			nameField = document.getElementById('name-field');
			ringsList = document.getElementById('rings-list');
			scoreOneBtn = document.getElementById('score1');
		};
		
		var bindEvents = function () {
			idBtn.addEventListener('click', onIdBtn);
			scoreOneBtn.addEventListener('click', onScoreBtn.bind(null, Competitors.HONG, 1));
		};
		
		
		var onNameField = function () {
			// If Enter key was pressed...
			if (evt.which === 13 || evt.keyCode === 13) {
                // Check name field is not empty
				if (nameField.value.length > 0) {
                    // Remove event listener
                    nameField.removeEventListener('keypress', onPwdField);
                    
					// Send identification to server
					IO.sendId(nameField.value);
				} else {
                    
                }
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
		
		
		var clearRingsList = function () {
			while (ringsList.hasChildNodes()) {
				ringsList.removeChild(ringsList.lastChild);
			}
		};
		
		var updateRingsList = function (ids) {
			ringIds = ids || ringIds;
			ringIds.sort();
			
			clearRingsList();
			
			ringIds.forEach(function (ringId) {
				var li = document.createElement('li');
				var btn = document.createElement('button');
				btn.appendChild(document.createTextNode(ringId));
				btn.addEventListener('click', function () {
					IO.joinRing(ringId);
				});
				li.appendChild(btn);
				ringsList.appendChild(li);
			});
		};
		
		var pushNewRing = function (ringId) {
			ringIds.push(ringId);
			updateRingsList();
		};
		
		var onShakeEnd = function (evt) {
			evt.target.classList.remove("shake");
			evt.target.removeEventListener('animationend', onShakeEnd);
		};
		
		
		return {
			init: init,
			showView: showView,
			updateRingsList: updateRingsList,
			pushNewRing: pushNewRing
		};
		
	}());
	
	
	View.init();
	
});
