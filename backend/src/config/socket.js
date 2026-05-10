let io;

export const initSocket = (socketServer) => {
  io = socketServer;

  io.on('connection', (socket) => {
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
    });
  });
};

export const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};

export const emitToProject = (projectId, event, payload) => {
  if (io && projectId) io.to(`project:${projectId}`).emit(event, payload);
};
