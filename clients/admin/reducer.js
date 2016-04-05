import { Map } from 'immutable';

export default function(state = Map(), action) {
  switch (action.type) {
    case 'SET_FOO':
      return state.set('foo', 'bar');
      
    case 'SET_STATE':
      return state.merge(action.state);
      
    default:
      return state;
  }
}
