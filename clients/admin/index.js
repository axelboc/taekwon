import { createStore, applyMiddleware, compose } from 'redux';
import { remoteActionMiddleware } from '../shared/remote-action';
import { setStateAction } from '../shared/set-state';
import reducer from './reducer';
import io from 'socket.io-client';

const store = createStore(
  reducer,
  applyMiddleware(remoteActionMiddleware)
);

const socket = io(`http://${process.env.HOST}:${process.env.PORT}`);

socket.on('connect', () => {
  console.log('connected!');
});

socket.on('state', compose(
  store.dispatch.bind(store),
  setStateAction
));
