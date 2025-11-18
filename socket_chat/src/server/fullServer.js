// fullServer.js
const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/client', express.static(path.join(__dirname, '..', 'client')));
app.use('/uploads', express.static(UPLOAD_DIR));

let rooms = {};

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('joinRoom', (room, username) => {
    socket.join(room);
    socket.data.username = username || 'User';

    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    socket.to(room).emit('userStatus', `${socket.data.username} vừa online`);
  });

  socket.on('typing', ({ room, username }) => {
    socket.to(room).emit('userTyping', `${username} đang gõ...`);
  });

  socket.on('stopTyping', (room) => {
    socket.to(room).emit('userStopTyping');
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        if (rooms[room].size === 0) {
          delete rooms[room];
        } else {
          socket.to(room).emit('userStatus', `Một người vừa offline`);
        }
      }
    });
  });

  socket.on('call-user', ({ to, from }) => {
    io.to(to).emit('incoming-call', { from });
  });

  socket.on('offer', ({ to, sdp }) => {
    io.to(to).emit('offer', { from: socket.id, sdp });
  });

  socket.on('answer', ({ to, sdp }) => {
    io.to(to).emit('answer', { from: socket.id, sdp });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });
});

app.post('/upload-file', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const { room, username } = req.body;
    if (!file) return res.status(400).json({ ok: false, message: 'No file' });

    const fileUrl = `/uploads/${file.filename}`;
    if (room) {
      io.to(room).emit('fileMessage', {
        username: username || 'User',
        url: fileUrl,
        original: file.originalname,
        size: file.size,
        timestamp: Date.now()
      });
    }
    return res.json({ ok: true, url: fileUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
