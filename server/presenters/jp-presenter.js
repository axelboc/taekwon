import { Map } from 'immutable';

const jpPresenter = {
  rings: presentRings
};

function presentRings(state) {
  return state.get('rings').map(ring => Map({
    isOpen: ring.get('jp') !== null
  }));
}

export default jpPresenter;
