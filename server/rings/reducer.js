import { List, Map } from 'immutable';
import { INIT, ADD, OPEN, CLOSE } from './actions';

const initialState = new List();

function initRing(index) {
  return Map({
    index,
    jp: null,
    cjs: List(),
    slotCount: 4,
    mathes: List()
  });
}

export default function ringsReducer(state = initialState, action) {
  switch (action.type) {
    case INIT:
      return List(Array.from({ length: action.payload.count }, (val, index) => initRing(index)));
    
    case ADD:
      return state.push(initRing(state.size));
    
    case OPEN:
      return state.setIn([action.payload.index, 'jp'], action.payload.jpId);
    
    case CLOSE:
      return state.setIn([action.payload.index, 'jp'], null);
    
    default:
      return state;
  }
}
