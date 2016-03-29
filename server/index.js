import http from 'http';
import connect from 'connect';
import serveStatic from 'serve-static';
import makeStore from './store';

// Create and configure server
let app = connect();
app.use(serveStatic('public'));

// Start server
http.createServer(app).listen(80);

// Initialise Redux store
const store = makeStore();

