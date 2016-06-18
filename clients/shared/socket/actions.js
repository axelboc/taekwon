export const SET_CONNECTED = 'socket/SET_CONNECTED';
export const SET_RECONNECTING = 'socket/SET_RECONNECTING';

export const setConnected = (isConnected) => ({
  type: SET_CONNECTED,
  payload: { isConnected }
});

export const setReconnecting = (isReconnecting) => ({
  type: SET_RECONNECTING,
  payload: { isReconnecting }
});
