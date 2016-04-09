import { createStore, applyMiddleware } from 'redux';
import { remoteActionMiddleware } from './remote-action';
import reducer from './reducer';
import io from 'socket.io-client';

const store = createStore(reducer, applyMiddleware(remoteActionMiddleware));

const socket = io(`http://${process.env.HOST}:${process.env.PORT}`);

socket.on('connect', () => {
  console.log('connected!');
});

socket.on('state', (state) => {
  store.dispatch({
    type: 'SET_STATE',
    state
  });
});
