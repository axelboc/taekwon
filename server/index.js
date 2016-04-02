import createServer from './server';
import createIO from './io';
import createStore from './store';

// Create web server
const server = createServer();

// Create socket server
const io = createIO(server);

// Create Redux store
const store = createStore();

// Listen for socket connections
io.on('connection', (socket) => {
  
});

// Start server
server.listen(80);
