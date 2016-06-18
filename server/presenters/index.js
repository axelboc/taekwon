import admin from './admin-presenter';
import cj from './cj-presenter';
import jp from './jp-presenter';

const presenters = {
  admin,
  cj: combinePresenters(cj),
  jp: combinePresenters(jp)
};

/**
 * Combine multiple presenters into one.
 * @param {Object} presenters
 * @return {Function}
 */
export function combinePresenters(presenters) {
  // Return a new presenter
  return (...args) => {
    // Loop through every sub-presenter, invoke it, and store its output against its key in a plain object
    return Object.keys(presenters).reduce((presentedState, key) => {
      presentedState[key] = presenters[key](...args);
      return presentedState;
    }, {});
  };
}

export default presenters;
