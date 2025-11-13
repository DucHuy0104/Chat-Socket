import { User } from './models/User.js';
import { Room } from './models/Room.js';
import { Message } from './models/Message.js';

export function createSocket(io) {
  const onlineUsers = new Map(); // username -> socketId
  const socketToUser = new Map(); // socketId -> username

  async function ensureRoom(name) {
    if (!name) return;
    const existing = await Room.findOne({ name });
    if (!existing) {
      await Room.create({ name });
    }
  }

  io.on('connection', (socket) => {
    console.log('🔌 Client connected', socket.id);

    socket.on('set_username', async (username, ack) => {
      try {
        username = (username || '').trim();
        if (!username) return ack && ack({ ok: false, error: 'Tên không hợp lệ' });
        socketToUser.set(socket.id, username);
        onlineUsers.set(username, socket.id);
        let user = await User.findOne({ username });
        if (!user) user = await User.create({ username, socketId: socket.id, rooms: [] });
        else { user.socketId = socket.id; await user.save(); }

        const defaultRoom = 'general';
        await ensureRoom(defaultRoom);
        socket.join(defaultRoom);
        user.rooms = Array.from(new Set([...(user.rooms||[]), defaultRoom]));
        await user.save();

        socket.to(defaultRoom).emit('system', `${username} đã vào phòng ${defaultRoom}`);
        const rooms = [...new Set([defaultRoom])];
        ack && ack({ ok: true, rooms, usersOnline: Array.from(onlineUsers.keys()) });
      } catch (e) {
        console.error(e);
        ack && ack({ ok: false, error: 'Lỗi set_username' });
      }
    });

    socket.on('join_room', async (room, ack) => {
      try {
        room = (room || '').trim();
        const username = socketToUser.get(socket.id);
        if (!username || !room) return ack && ack({ ok: false });
        await ensureRoom(room);
        socket.join(room);
        socket.to(room).emit('system', `${username} đã tham gia phòng ${room}`);
        const last = await Message.find({ room, isPrivate: false })
          .sort({ createdAt: -1 }).limit(50).lean();
        ack && ack({ ok: true, history: last.reverse() });
      } catch (e) {
        console.error(e);
        ack && ack({ ok: false });
      }
    });

    socket.on('leave_room', async (room) => {
  const username = socketToUser.get(socket.id);

  try {
    // Rời phòng
    socket.leave(room);

    // Gửi thông báo cho các user còn lại
    socket.to(room).emit('system', `${username} đã rời phòng ${room}`);

    // Kiểm tra và xoá phòng nếu trống
    const roomInfo = io.sockets.adapter.rooms.get(room);

    if (!roomInfo || roomInfo.size === 0) {
      console.log(`🧹 Xóa phòng vì không còn ai: ${room}`);

      await Room.deleteOne({ name: room });
      await Message.deleteMany({ room });

      io.emit('system', `Phòng ${room} đã bị xoá vì không còn người tham gia`);
    }
  } catch (e) {
    console.error(e);
  }
});


    socket.on('chat_message', async ({ room, content }, ack) => {
      const username = socketToUser.get(socket.id);
      if (!username || !room || !content) return;
      const msg = await Message.create({
        content, sender: username, room, isPrivate: false
      });
      io.to(room).emit('chat_message', msg);
      ack && ack({ ok: true });
    });

    socket.on('private_message', async ({ to, content }, ack) => {
      const from = socketToUser.get(socket.id);
      if (!from || !to || !content) return ack && ack({ ok: false });
      const payload = await Message.create({
        content, sender: from, to, isPrivate: true
      });
      const toSocket = onlineUsers.get(to);
      if (toSocket) io.to(toSocket).emit('private_message', payload);
      socket.emit('private_message', payload);
      ack && ack({ ok: true });
    });

    socket.on('disconnect', async () => {
  const username = socketToUser.get(socket.id);

  // Xử lý phòng user đang tham gia
  const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
  for (const r of rooms) {
    socket.leave(r);
    await clearRoomIfEmpty(r);
  }

  socketToUser.delete(socket.id);
  if (username) {
    onlineUsers.delete(username);
    io.emit('users_online', Array.from(onlineUsers.keys()));
    io.emit('system', `${username} đã thoát`);
    const u = await User.findOne({ username });
    if (u) { u.socketId = ''; u.lastActive = new Date(); await u.save(); }
  }
  console.log('❌ Client disconnected', socket.id);
});


    socket.on('get_users_online', (ack) => {
      ack && ack({ users: Array.from(onlineUsers.keys()) });
    });
  });
}
