/**
 * Combine multiple presenters into one.
 * @param {Object} presenters
 * @return {Function}
 */
export default function combinePresenters(presenters) {
  // Return a new presenter
  return (...args) => {
    // Loop through every sub-presenter, invoke it, and store its output against its key in a plain object
    return Object.keys(presenters).reduce((presentedState, key) => {
      presentedState[key] = presenters[key](...args);
      return presentedState;
    }, {});
  };
}
