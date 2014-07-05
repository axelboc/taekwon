
/**
 * Corner Judge 'View' module
 */
define(['../common/competitors', 'enum/ui-views', 'enum/ui-backdrops'], function (Competitors, UIViews, UIBackdrops) {

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


	
});
	