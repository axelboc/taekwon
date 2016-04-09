/**
 * Make an action creator return remote actions.
 * @param {Function} actionCreator
 */
export const makeRemote = actionCreator => {
  // Return a new action creator
  return (...args) => {
    // Execute action 
    let action = actionCreator(...args);
    action.meta = { remote: true };
    return action;
  };
};

/**
 * Emit remote actions on a socket connection.
 * @param {Socket} socket
 */
export const remoteActionMiddleware = socket => () => next => action => {
  if (action.meta && action.meta.remote) {
    socket.emit('action', action);
  }
  
  return next(action);
};
