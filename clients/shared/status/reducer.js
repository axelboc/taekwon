import { Map } from 'immutable';
import { createReducer } from 'redux-immutablejs';
import { SET_CONNECTED, SET_RECONNECTING } from './actions';

const initialState = new Map();

export const setConnected = (state, { payload }) => {
  return state.set('connected', payload.connected);
};

export const setReconnecting = (state, { payload }) => {
  return state.set('reconnecting', payload.reconnecting);
};

export default createReducer(initialState, {
  [SET_CONNECTED]: setConnected,
  [SET_RECONNECTING]: setReconnecting
});
