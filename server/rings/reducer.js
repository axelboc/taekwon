import { List, Map } from 'immutable';
import { INIT } from './actions';

const initialState = new List();

export default function ringsReducer(state = initialState, action) {
  switch (action.type) {
    case INIT:
      return List(Array.from({ length: action.count }, (val, index) => Map({
        index,
        jp: null,
        cjs: List(),
        slotCount: 4,
        mathes: List()
      })));
    
    default:
      return state;
  }
}
