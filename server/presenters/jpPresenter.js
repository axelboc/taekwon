import { Map } from 'immutable';
import combinePresenters from './combinePresenters';

export const presenters = {
  rings: presentRings
};

function presentRings(state) {
  return state.get('rings').map(ring => Map({
    isOpen: ring.get('jp') !== null
  }));
}

export default combinePresenters(presenters);
