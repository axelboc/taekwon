import socketIO from 'socket.io';
import { createSubscriber } from './store';

export default function (server, store) {
  const io = socketIO(server);

  // Listen for socket connections
  io.on('connection', (socket) => {
    socket.emit('state', store.getState().toJS());
    socket.on('action', store.dispatch.bind(store));

    // Send a subset of the state to the client every time the state changes
    store.subscribe(createSubscriber(store, socket, 'admin'));
  });
  
  return io;
}
