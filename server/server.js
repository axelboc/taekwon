import http from 'http';
import connect from 'connect';
import serveStatic from 'serve-static';

export default function () {
  // Create and configure Connect app
  const app = connect();
  app.use(serveStatic('public'));

  // Create and return HTTP server
  return http.createServer(app);
}
