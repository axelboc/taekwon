export const ADD = 'clients/ADD';
export const REMOVE = 'clients/REMOVE';
export const SET_CONNECTED = 'clients/SET_CONNECTED';

export const SET_CJ_NAME = 'clients/SET_CJ_NAME';
export const SET_CJ_AUTHORISED = 'clients/SET_CJ_AUTHORISED';

export const add = (id, type, data = null) => ({
  type: ADD,
  payload: { id, type, data }
});

export const remove = (id) => ({
  type: REMOVE,
  payload: { id }
});

export const setConnected = (id, connected) => ({
  type: SET_CONNECTED,
  payload: { id, connected }
});

export const setCJName = (id, name) => ({
  type: SET_CJ_NAME,
  payload: { id, name }
});

export const setCJAuthorised = (id, authorised) => ({
  type: SET_CJ_AUTHORISED,
  payload: { id, authorised }
});
