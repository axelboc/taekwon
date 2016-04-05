import createServer from './server';
import createIO from './io';
import createStore, { createSubscriber } from './store';

// Create web server
const server = createServer();

// Create socket server
const io = createIO(server);

// Create Redux store
const store = createStore();

// Listen for socket connections
io.on('connection', (socket) => {
  socket.emit('state', store.getState().toJS());
  socket.on('action', store.dispatch.bind(store));

  // Send a subset of the state to the client every time the state changes
  store.subscribe(createSubscriber(store, socket, 'admin'));
});

// Start server
server.listen(80);
