import createStore from '../shared/store';
import createIO, { dispatchSocketEvents } from '../shared/io';
import reducer from './reducer';

// Create socket server
const socket = createIO();

// Create Redux store
const store = createStore(reducer, socket);

// Dispatch actions on socket events
dispatchSocketEvents(socket, store);
