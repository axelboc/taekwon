import { List, Map } from 'immutable';
import { INIT, ADD, REMOVE, OPEN, CLOSE, ADD_CJ, REMOVE_CJ } from './actions';

const initialState = new List();

function initRing() {
  return Map({
    jp: null,
    cjs: List(),
    slotCount: 4,
    mathes: List()
  });
}

export default function ringsReducer(state = initialState, action) {
  const payload = action.payload;
  
  switch (action.type) {
    case INIT:
      return List(Array.from({ length: payload.count }, () => initRing()));
    
    case ADD:
      return state.push(initRing(state.size));
    
    case REMOVE:
      return state.pop();
    
    case OPEN:
      return state.setIn([payload.index, 'jp'], payload.jpId);
    
    case CLOSE:
      return state.setIn([payload.index, 'jp'], null);
    
    case ADD_CJ:
      return state.updateIn([payload.index, 'cjs'], cjs => cjs.push(payload.cjId));
    
    case REMOVE_CJ:
      return state.setIn(
        [payload.index, 'cjs'],
        state.getIn([payload.index, 'cjs']).filter(cjId => cjId !== payload.cjId)
      );
    
    default:
      return state;
  }
}
