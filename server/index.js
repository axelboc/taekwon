import createStore from './store';
import createServer from './server';
import createIO from './io';

// Create Redux store
const store = createStore();

// Create web server
const server = createServer();

// Create socket server
createIO(server, store);

// Start server
server.listen(80);
