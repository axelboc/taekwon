import socketIO from 'socket.io';

export default function (server) {
  const io = socketIO(server);
  return io;
}
