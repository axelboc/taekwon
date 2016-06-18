import reduceReducers from 'reduce-reducers';
import { combineReducers } from 'redux-immutablejs';
import { setStateReducer } from '../shared/setState';
import socket from '../shared/socket';
import status from './status';

const cjReducer = reduceReducers(
  setStateReducer,
  combineReducers({
    socket: socket.reducer,
    status: status.reducer
  })
);

export default cjReducer;
