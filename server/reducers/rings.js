import { List, Map } from 'immutable';
import { INIT_RINGS } from '../actions/rings';

export default function ringsReducer(state = new List(), action) {
  switch (action.type) {
    case INIT_RINGS:
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
};
