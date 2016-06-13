/**
 * Transform an action creator into a remote action creator.
 * @param {Function} actionCreator
 * @return {Function}
 */
export const makeRemote = actionCreator => {
  return (...args) => {
    // Invoke the original action creator
    let action = actionCreator(...args);

    // Enhance the returned action with the remote flag
    action.meta = action.meta || {};
    action.meta.isRemote = true;

    // Return the action
    return action;
  };
};

/**
 * Create a Redux middleware that emits remote actions onto a web socket.
 * @param {Socket} socket
 */
export const createRemoteActionMiddleware = socket => {
  return store => next => action => { // eslint-disable-line no-unused-vars
    // If the action is a remote action, emit it
    if (action.meta && action.meta.isRemote) {
      socket.emit('action', action);
    }
    
    // Invoke the next middleware
    return next(action);
  };
};
