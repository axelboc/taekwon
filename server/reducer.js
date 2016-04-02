import { combineReducers } from 'redux';
import rings from './rings';
import clients from './clients';

export default combineReducers({
  [rings.NAME]: rings.reducer,
  [clients.NAME]: clients.reducer
});
