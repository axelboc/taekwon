import reduceReducers from 'reduce-reducers';
import { combineReducers } from 'redux-immutablejs';
import { setStateReducer } from '../shared/set-state';
import { reducers as serverReducers } from '../../server/reducer';
import status from '../shared/status';

export const reducers = Object.assign({}, serverReducers, {
  [status.NAME]: status.reducer
});

const adminReducer = reduceReducers(
  setStateReducer,
  combineReducers(reducers)
);

export default adminReducer;
