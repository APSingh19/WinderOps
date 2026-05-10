import { io } from 'socket.io-client';

let socket;

export const connectSocket = (userId) => {
  if (socket || !userId) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
    transports: ['websocket']
  });
  socket.emit('join:user', userId);
  return socket;
};

export const joinProjectRoom = (projectId) => {
  if (socket && projectId) socket.emit('join:project', projectId);
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
  socket = null;
};
