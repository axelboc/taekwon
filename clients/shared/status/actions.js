export const SET_CONNECTED = 'status/SET_CONNECTED';
export const SET_RECONNECTING = 'status/SET_RECONNECTING';

export const setConnected = (connected) => ({
  type: SET_CONNECTED,
  payload: { connected }
});

export const setReconnecting = (reconnecting) => ({
  type: SET_RECONNECTING,
  payload: { reconnecting }
});
