import { compose } from 'redux';
import { setConnected, setReconnecting } from './socket/actions';
import { setStateAction } from './setState';
import io from 'socket.io-client';

/**
 * Dispatch Redux actions on socket events.
 * @param {Socket} socket
 * @param {Store} store
 */
export function dispatchSocketEvents(socket, store) {
  // Bind the store's dispatch function so it can be composed
  const dispatch = store.dispatch.bind(store);

  // Handle connection events
  const dispatchSetConnected = compose(dispatch, setConnected);
  socket.on('connect', dispatchSetConnected.bind(null, true));
  socket.on('reconnect', dispatchSetConnected.bind(null, true));
  socket.on('disconnect', dispatchSetConnected.bind(null, false));

  // Handle reconnection events
  const dispatchSetReconnecting = compose(dispatch, setReconnecting);
  socket.on('reconnect', dispatchSetReconnecting.bind(null, false));
  socket.on('reconnecting', dispatchSetReconnecting.bind(null, true));

  // Handle `state` messages
  socket.on('state', compose(dispatch, setStateAction));
}

/**
 * Create a new web socket.
 * @return {Socket}
 */
export default function createIO() {
  return io(`http://${process.env.HOST}:${process.env.PORT}`);
}
