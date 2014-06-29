
/**
 * Jury President 'View' module
 */
define(['minpubsub', 'handlebars', 'enum/ui-views', 'enum/ui-match-panels', 'enum/match-states', './match', './timer', 'match-config'], function (PubSub, Handlebars, UIViews, UIMatchPanels, MatchStates, Match, Timer, matchConfig) {
	
	var IO, sets,
		pwdAction, pwdInstr, pwdField,
		ringsList, ringsBtns,
		matchView, matchNewBtns, matchConfigBtn, match = null,
		timeKeeping, mainTimer, injuryTimer,
		stateManagement, stateStartBtn, stateEndBtn, matchResultBtn, injuryBtn,
		scoring, scoringJudges,
		scoreboardWrap, scoreboardTemplate, scoreboard, scoreboardCells,
		judgesList, judges, judgesById;

	// TODO: use pub/sub pattern instead of passing 'io' parameter to fix circular reference between IO and View modules
	var init = function (io) {
		IO = io;
		cacheElements();
		bindEvents();
	};

	var cacheElements = function () {
		sets = {
			views: document.getElementsByClassName('view'),
			panels: document.getElementsByClassName('panel')
		};

		pwdAction = document.getElementById('pwd-action');
		pwdInstr = document.getElementById('pwd-instr');
		pwdField = document.getElementById('pwd-field');

		ringsList = document.getElementById('rings-list');
		ringsBtns = ringsList.getElementsByTagName('button');

		matchView = document.getElementById('match-view');
		matchNewBtns = matchView.getElementsByClassName('match-btn-new');
		matchConfigBtn = document.getElementById('match-btn-config');
		
		timeKeeping = matchView.querySelector('.time-keeping');
		mainTimer = new Timer(
			timeKeeping.querySelector('.tk-timer--round > .tk-timer-min'),
			timeKeeping.querySelector('.tk-timer--round > .tk-timer-sec')
		);
		injuryTimer = new Timer(
			timeKeeping.querySelector('.tk-timer--injury > .tk-timer-min'),
			timeKeeping.querySelector('.tk-timer--injury > .tk-timer-sec')
		);
		
		stateManagement = matchView.querySelector('.state-management');
		stateStartBtn = stateManagement.querySelector('.sm-btn--start');
		stateEndBtn = stateManagement.querySelector('.sm-btn--end');
		matchResultBtn = stateManagement.querySelector('.sm-btn--result');
		injuryBtn = stateManagement.querySelector('.sm-btn--injury');
		
		scoring = matchView.querySelector('.scoring')
		scoringJudges = scoring.querySelectorAll('.sc-judge');

		scoreboardWrap = document.getElementById('scoreboard-wrap');
		scoreboardTemplate = Handlebars.compile(document.getElementById('scoreboard-template').innerHTML);

		judges = [];
		judgesById = {};
		judgesList = document.getElementById('judges-list');
		[].forEach.call(judgesList.getElementsByClassName('judge'), function (item, index) {
			judges[index] = {
				id: null,
				name: null,
				slot: index,
				rootLi: item,
				nameH3s: [item.querySelector('.judge-name'), scoringJudges[index].querySelector('.sc-judge-name')],
				stateSpan: item.querySelector('.judge-state'),
				btnsUl: item.querySelector('.judge-btns'),
				acceptBtn: item.querySelector('.judge-accept'),
				rejectBtn: item.querySelector('.judge-reject')
			};
		});
	};

	// TODO: event delegation
	var bindEvents = function () {
		pwdField.addEventListener('keypress', onPwdField);

		[].forEach.call(ringsBtns, function (btn, index) {
			btn.addEventListener('click', onRingsBtn.bind(null, index));
		});

		[].forEach.call(matchNewBtns, function (btn, index) {
			btn.addEventListener('click', onMatchNewBtn);
		});

		matchConfigBtn.addEventListener('click', showElem.bind(null, UIMatchPanels.CONFIG, 'panels'));

		stateStartBtn.addEventListener('click', onStateStartBtn);
		stateEndBtn.addEventListener('click', onStateEndBtn);
		matchResultBtn.addEventListener('click', onMatchResultBtn);
		injuryBtn.addEventListener('click', onInjuryBtn);
		
		PubSub.subscribe('match.created', onMatchCreated);
		PubSub.subscribe('match.stateChanged', onStateChanged);
		PubSub.subscribe('match.stateStarted', onStateStarted);
		PubSub.subscribe('match.stateEnded', onStateEnded);
		PubSub.subscribe('match.ended', onMatchEnded);
		PubSub.subscribe('match.injuryStarted', onInjuryStarted);
		PubSub.subscribe('match.injuryEnded', onInjuryEnded);
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
			judge.nameH3s.forEach(function (elem) {
				elem.textContent = cornerJudge.name;
			});

			// Show/hide accept/reject buttons and state span
			judge.btnsUl.classList.toggle("hidden", alreadyAuthorised);
			judge.stateSpan.classList.toggle("hidden", !alreadyAuthorised);

			if (alreadyAuthorised) {
				return judge;
			} else {
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

		// Hide buttons and show state span
		judge.btnsUl.classList.add("hidden");
		judge.stateSpan.classList.remove("hidden");

		// Remove listeners
		judge.acceptBtn.removeEventListener('click', judge.acceptFn);
		judge.rejectBtn.removeEventListener('click', judge.rejectFn);
		judge.acceptFn = null;
		judge.rejectFn = null;

		if (!accept) {
			judge.nameH3s.forEach(function (elem) {
				elem.textContent = "Judge #" + (judge.slot + 1);
			});
			judge.stateSpan.textContent = "Waiting for connection";

			delete judgesById[judge.id];
			judge.id = null;
			judge.name = null;
		} else {
			judge.stateSpan.textContent = "Connected";
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
			judge.nameH3s.forEach(function (elem) {
				elem.textContent = cornerJudge.name;
			});
			judge.stateSpan.textContent = "Connected";
		} else {
			// Show connection lost message
			judge.stateSpan.textContent = "Connection lost. Waiting for reconnection...";
		}
	};

	//var enabled = false;
	var onMatchNewBtn = function () {
		match = new Match(Object.keys(judgesById));
		showElem(UIMatchPanels.MATCH, 'panels');
		
		//enabled = !enabled;
		//IO.enableScoring(enabled);
		//onMatchResultBtn();
	};

	var onStateStartBtn = function (evt) {
		evt.target.blur();
		match.startState();
	};

	var onStateEndBtn = function (evt) {
		evt.target.blur();
		match.endState();
	};

	var onInjuryBtn = function (evt) {
		evt.target.blur();
		match.startEndInjury();
	};
	
	
	var onMatchCreated = function (match) {
		console.log("Match created");
		updateStateBtns(null, false);
		matchResultBtn.classList.add("hidden");
		stateStartBtn.classList.remove("hidden");
		stateEndBtn.classList.remove("hidden");
	};
	
	var onStateChanged = function (state) {
		var stateStr = state.toLowerCase().replace('-', ' ');
		console.log("State changed: " + stateStr);
		
		// Reset main timer
		mainTimer.reset((state === MatchStates.BREAK ? matchConfig.breakTime :
							(state === MatchStates.GOLDEN_POINT ? 0 : matchConfig.roundTime)));
		
		// Update text of start and end buttons
		stateStartBtn.textContent = "Start " + stateStr;
		stateEndBtn.textContent = "End " + stateStr;
		
		// Mark start button as major on non-BREAK states
		stateStartBtn.classList.toggle('btn--major', state !== MatchStates.BREAK);
		stateEndBtn.classList.toggle('btn--major', state !== MatchStates.BREAK);
	}
	
	var onStateStarted = function (state) {
		console.log("State started: " + state);
		updateStateBtns(state, true);
		
		mainTimer.start(state !== MatchStates.GOLDEN_POINT, false);
		
		if (state !== MatchStates.BREAK) {
			IO.enableScoring(true);
		}
	};
	
	var onStateEnded = function (state) {
		console.log("State ended: " + state);
		updateStateBtns(state, false);
		mainTimer.stop();
		
		if (state !== MatchStates.BREAK) {
			IO.enableScoring(false);
		}
	};
	
	var updateStateBtns = function (state, starting) {
		// State start/end buttons
		enableBtn(stateEndBtn, starting);
		enableBtn(stateStartBtn, !starting);
		
		// Enable injury button when a non-BREAK state is starting
		enableBtn(injuryBtn, starting && state !== MatchStates.BREAK);
	};
	
	var onMatchEnded = function () {
		console.log("Match ended");
		stateStartBtn.classList.add("hidden");
		stateEndBtn.classList.add("hidden");
		matchResultBtn.classList.remove("hidden");
		mainTimer.reset(0);
	};

	var onInjuryStarted = function () {
		enableBtn(stateEndBtn, false);
		injuryBtn.textContent = "End injury";
		timeKeeping.classList.add('tk_injury');
		
		injuryTimer.reset(matchConfig.injuryTime);
		injuryTimer.start(true, true);
		mainTimer.stop();
		
		IO.enableScoring(false);
	};

	var onInjuryEnded = function (state) {
		enableBtn(stateEndBtn, true);
		injuryBtn.textContent = "Start injury";
		timeKeeping.classList.remove('tk_injury');
		
		injuryTimer.stop();
		mainTimer.start(state !== MatchStates.GOLDEN_POINT, true);
		
		IO.enableScoring(true);
	};
	
	
	// TODO: two-way data binding
	var onMatchResultBtn = function () {
		// TODO: use JS instead of handlebars to populate table to have more control over classes for styling
		var matchContext = {
			penalties: [-1, -2],
			match: {
				hadTwoRounds: matchConfig.roundCount == 2,
				hadTieBreaker: false,
				hadGoldenPoint: false
			},
			judges: [{
				name: "Axel",
				results: [23, 25, 12, 34, 45, 46]
			}, {
				name: "Judge #2",
				results: [23, 25, 12, 34, 45, 46]
			}, {
				name: "Judge #3",
				results: [23, 25, 12, 34, 45, 46]
			}, {
				name: "Judge #4",
				results: [23, 25, 12, 34, 45, 46]
			}]
		};

		// Evaluate scoreboard template with match context
		scoreboardWrap.innerHTML = scoreboardTemplate(matchContext);

		// Get scoreboard and cells
		scoreboard = scoreboardWrap.getElementsByClassName('scoreboard')[0];
		scoreboardCells = scoreboard.getElementsByTagName('td');

		// Add classes to scoreboard root
		var gcm = matchContext.match;
		scoreboard.classList.toggle('sb--2-rounds', gcm.hadTwoRounds);
		scoreboard.classList.toggle('sb--tie', gcm.hadTieBreaker);
		scoreboard.classList.toggle('sb--golden-pt', gcm.hadGoldenPoint);

		// Add classes to cells
		var cellsPerRow = matchContext.judges[0].results.length;
		[].forEach.call(scoreboardCells, function (cell, index) {
			cell.classList.add(((index % cellsPerRow) % 2 === 0 ? 'hong-sbg' : 'chong-sbg'));
		})

		showElem(UIMatchPanels.RESULT, 'panels');
	};


	// Show element with given ID and hide all other elements in set with given name
	var showElem = function (elemId, setName) {
		[].forEach.call(sets[setName], function (elem) {
			if (elem.id === elemId) {
				elem.classList.remove('hidden');
			} else {
				elem.classList.add('hidden');
			}
		});
	};
	
	
	// Enable/disable button
	var enableBtn = function (btn, enable) {
		if (enable) {
			btn.removeAttribute('disabled');
		} else {
			btn.setAttribute('disabled', 'disabled');
		}
	}


	var onShakeEnd = function (evt) {
		// Remove shake class in case another shake animation needs to be performed
		evt.target.classList.remove('shake');
		// Remove listener
		evt.target.removeEventListener('animationend', onShakeEnd);
	};

	var shakeField = function (field) {
		// Listen to end of shake animation
		field.addEventListener('animationend', onShakeEnd);
		// Start shake animation
		field.classList.add('shake');
	};


	return {
		init: init,
		pwdResult: pwdResult,
		onRingAllocations: onRingAllocations,
		onRingAllocationChanged: onRingAllocationChanged,
		onAuthoriseCornerJudge: onAuthoriseCornerJudge,
		onCornerJudgeStateChanged: onCornerJudgeStateChanged,
		showElem: showElem
	};
	
});
