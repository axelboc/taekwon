import { Map } from 'immutable';
import { createReducer } from 'redux-immutablejs';
import { SET_CONNECTED, SET_RECONNECTING } from './actions';

const initialState = new Map({
  isConnected: false,
  isReconnecting: false
});

export const setConnected = (state, { payload }) => {
  return state.set('isConnected', payload.isConnected);
};

export const setReconnecting = (state, { payload }) => {
  return state.set('isReconnecting', payload.isReconnecting);
};

export default createReducer(initialState, {
  [SET_CONNECTED]: setConnected,
  [SET_RECONNECTING]: setReconnecting
});
