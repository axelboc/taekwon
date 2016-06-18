import reduceReducers from 'reduce-reducers';
import { combineReducers } from 'redux-immutablejs';
import { setStateReducer } from '../shared/setState';
import { reducers as serverReducers } from '../../server/reducer';
import socket from '../shared/socket';

export const reducers = Object.assign({}, serverReducers, {
  [socket.NAME]: socket.reducer
});

const adminReducer = reduceReducers(
  setStateReducer,
  combineReducers(reducers)
);

export default adminReducer;
