import { createStore } from 'redux';
import reducer from './reducer';
import presenters from './presenters';

export default function () {
  return createStore(reducer);
}

export function createSubscriber(store, socket, clientType) {
  const presenter = presenters[clientType];
  
  return () => {
    const state = store.getState().toJS();
    const subState = presenter(state);
    socket.emit('state', subState);
  };
}
