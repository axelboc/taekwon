import { Map } from 'immutable';
import { createReducer } from 'redux-immutablejs';
import { ADD, REMOVE, SET_CONNECTED, SET_CJ_NAME, SET_CJ_AUTHORISED } from './actions';

const initialState = new Map();

export const add = (state, { payload }) => {
  return state.set(payload.id, Map({
    type: payload.type,
    connected: true,
    data: payload.data
  }));
};

export const remove = (state, { payload }) => {
  return state.delete(payload.id);
};

export const setConnected = (state, { payload }) => {
  return state.setIn([payload.id, 'connected'], payload.connected);
};

export const setCJName = (state, { payload }) => {
  return state.setIn([payload.id, 'data', 'name'], payload.name);
};

export const setCJAuthorised = (state, { payload }) => {
  return state.setIn([payload.id, 'data', 'authorised'], payload.authorised);
};

export default createReducer(initialState, {
  [ADD]: add,
  [REMOVE]: remove,
  [SET_CONNECTED]: setConnected,
  [SET_CJ_NAME]: setCJName,
  [SET_CJ_AUTHORISED]: setCJAuthorised
});
