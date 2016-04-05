import { Map } from 'immutable';
import { ADD, REMOVE, SET_CONNECTED, SET_CJ_NAME, SET_CJ_AUTHORISED } from './actions';

const initialState = new Map();

export default function clientsReducer(state = initialState, action) {
  const payload = action.payload;
  
  switch (action.type) {
    case 'SET_FOO':
      return state.set('foo', 'bar');
    
    case ADD:
      return state.set(payload.id, Map({
       type: payload.type,
       connected: true,
       data: payload.data
      }));
      
    case REMOVE:
      return state.delete(payload.id);
      
    case SET_CONNECTED:
      return state.setIn([payload.id, 'connected'], payload.connected);
      
    case SET_CJ_NAME:
      return state.setIn([payload.id, 'data', 'name'], payload.name);
      
    case SET_CJ_AUTHORISED:
      return state.setIn([payload.id, 'data', 'authorised'], payload.authorised);
    
    default:
      return state;
  }
}
