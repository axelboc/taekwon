import { Map } from 'immutable';

const cjPresenter = {
  rings: presentRings
};

function presentRings(state) {
  return state.get('rings').map(ring => Map({
    isOpen: ring.get('jp') !== null,
    isFull: ring.get('cjs').size === ring.get('slotCount')
  }));
}

export default cjPresenter;
