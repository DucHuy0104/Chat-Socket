// demoServer.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {}; // lưu room hiện có

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // user join room
  socket.on('joinRoom', (room, username) => {
    socket.join(room);

    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    // thông báo online cho room
    socket.to(room).emit('userStatus', `${username} vừa online`);
  });

  // typing
  socket.on('typing', ({ room, username }) => {
    socket.to(room).emit('userTyping', `${username} đang gõ...`);
  });

  socket.on('stopTyping', (room) => {
    socket.to(room).emit('userStopTyping');
  });

  // disconnect
  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        if (rooms[room].size === 0) {
          delete rooms[room];
          console.log(`Room ${room} đã được xóa vì trống`);
        } else {
          socket.to(room).emit('userStatus', `Một người vừa offline`);
        }
      }
    });
  });
});

server.listen(3000, () => {
  console.log('Server chạy tại http://localhost:3000');
});
