import { combineReducers } from 'redux-immutablejs';
import rings from './rings';
import clients from './clients';

export default combineReducers({
  [rings.NAME]: rings.reducer,
  [clients.NAME]: clients.reducer
});
