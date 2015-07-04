'use strict';

var helpers = {

	/**
	 * Subscribe to inbound IO events.
	 * @param {IO} io
	 * @param {String} namespace
	 * @param {Array} events
	 * @param {Object} scope
	 */
	subscribeToEvents: function subscribeToEvents(io, namespace, events, scope) {
		events.forEach(function (evt) {
			io.primus.on(namespace + '.' + evt, scope[evt].bind(scope));
		}, this);
	},

	/**
	 * Shake a DOM element (e.g. a text field).
	 * @param {HTMLElement} elem
	 */
	shake: function shake(elem) {
		var onShakeEnd = function onShakeEnd() {
			// Remove shake class in case another shake animation needs to be performed
			elem.classList.remove('shake');
			// Remove listener
			elem.removeEventListener('animationend', onShakeEnd);
		};

		// Listen to end of shake animation
		elem.addEventListener('animationend', onShakeEnd);
		// Start shake animation
		elem.classList.add('shake');
	},

	/**
	 * Enable/disable button.
	 * @param {HTMLButtonElement} btn
	 * @param {Boolean} enable
	 */
	enableBtn: function enableBtn(btn, enable) {
		if (enable) {
			btn.removeAttribute('disabled');
		} else {
			btn.setAttribute('disabled', 'disabled');
		}
	}

};

module.exports = helpers;
