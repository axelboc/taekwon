
/**
 * Corner Judge 'View' module
 */
define(['../common/competitors', 'enum/ui-views', 'enum/ui-backdrops'], function (Competitors, UIViews, UIBackdrops) {

	var IO, isScoringEnabled = false,
		views, backdropWrap, backdrops,
		nameField, ringsInstr, ringsList, ringsBtns,
		scoreBtnsHong, scoreBtnsChong;

	var init = function (io) {
		IO = io;
		cacheElements();
		bindEvents();
	};
	
	var cacheElements = function () {
		views = document.getElementsByClassName('view');
		backdropWrap = document.getElementById('backdrop-wrap');
		backdrops = backdropWrap.getElementsByClassName('backdrop');
		nameField = document.getElementById('name-field');
		ringsInstr = document.getElementById('rings-instr');
		ringsList = document.getElementById('rings-list');
		ringsBtns = ringsList.getElementsByTagName('button');
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
		showView(UIViews.RINGS);
	};

	var onScoringStateChanged = function (enabled) {
		isScoringEnabled = enabled;
		toggleBackdrop(!enabled, UIBackdrops.DISABLED);
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
		if (!show && backdrop === UIBackdrops.DISCONNECTED && !isScoringEnabled) {
			// Restore waiting backdrop instead
			show = true;
			backdrop = UIBackdrops.WAITING;
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
		onScoringStateChanged: onScoringStateChanged,
		showView: showView,
		toggleBackdrop: toggleBackdrop
	};
	
});
	