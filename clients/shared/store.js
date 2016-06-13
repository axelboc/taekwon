import { Iterable } from 'immutable';
import { createStore as reduxCreateStore, applyMiddleware } from 'redux';
import { createRemoteActionMiddleware } from '../shared/remote-action';
import createLogger from 'redux-logger';

const middlewares = [];

// In development, use the logger middleware
if (process.env.NODE_ENV === 'development') {
  middlewares.push(createLogger({
    stateTransformer: (state) => {
      if (Iterable.isIterable(state)) { return state.toJS(); }
      return state;
    }
  }));
}

/**
 * Create a Redux store.
 * @param {Function} reducer
 * @param {Socket} socket - the socket on which to emit remote actions
 * @return {Store}
 */
export default function createStore(reducer, socket) {
  // Create and add the remote action middleware
  const remoteActionMiddleware = createRemoteActionMiddleware(socket);
  middlewares.push(remoteActionMiddleware);

  // Create and return the store
  return reduxCreateStore(
    reducer,
    applyMiddleware(...middlewares)
  );
}
