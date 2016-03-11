import { combineReducers } from 'redux';
import rings from './rings';

export default combineReducers({
  [rings.NAME]: rings.reducer
});
