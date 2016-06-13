import { combineReducers } from 'redux-immutablejs';
import rings from './rings';
import clients from './clients';

export const reducers = {
  [rings.NAME]: rings.reducer,
  [clients.NAME]: clients.reducer
};

const serverReducer = combineReducers(reducers);
export default serverReducer;
