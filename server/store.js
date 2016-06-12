import { createStore } from 'redux';
import reducer from './reducer';
import createPresenter from './presenters';

export default function () {
  return createStore(reducer);
}

export function createSubscriber(store, socket, clientType, clientId) {
  const presenter = createPresenter(clientType, clientId);
  
  return () => {
    const state = store.getState().toJS();
    const subState = presenter(state);
    socket.emit('state', subState);
  };
}
