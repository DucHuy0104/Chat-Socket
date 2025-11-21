import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Server } from 'socket.io';
import { connectDB } from './db.js';
import { createSocket } from './socket.js';
import { Message } from './models/Message.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 📁 Cấu hình upload file
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/rooms/:room/messages', async (req, res) => {
  const { room } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const docs = await Message.find({ room, isPrivate: false }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(docs.reverse());
});

app.get('/api/dm/:a/:b', async (req, res) => {
  const { a, b } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  const docs = await Message.find({
    isPrivate: true,
    $or: [
      { sender: a, to: b },
      { sender: b, to: a }
    ]
  }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(docs.reverse());
});

// 📤 Upload file endpoint
app.post('/upload-file', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const { room, username } = req.body;
    
    if (!file) {
      return res.status(400).json({ ok: false, message: 'Không có file' });
    }

    const fileUrl = `/uploads/${file.filename}`;
    
    if (room) {
      // Emit file message tới tất cả clients trong room
      io.to(room).emit('fileMessage', {
        username: username || 'User',
        url: fileUrl,
        original: file.originalname,
        size: file.size,
        timestamp: Date.now(),
        room: room
      });
    }
    
    return res.json({ ok: true, url: fileUrl, filename: file.filename });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi upload file' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
createSocket(io);

const PORT = process.env.PORT || 3000;
connectDB(process.env.MONGO_URL).then(() => {
  server.listen(PORT, () => {
    console.log('🚀 Server listening on http://localhost:' + PORT);
  });
});
