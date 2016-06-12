import { Map } from 'immutable';

function presentRingState(ring) {
  return Map({
    isOpen: ring.get('jp') !== null,
    isFull: ring.get('cjs').size === ring.get('slotCount')
  });
}

export default (id, state) => {
  return Map({
    rings: state.get('rings').map(presentRingState)
  });
};
