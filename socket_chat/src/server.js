import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './db.js';
import { createSocket } from './socket.js';
import { Message } from './models/Message.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
createSocket(io);

const PORT = process.env.PORT || 3000;
connectDB(process.env.MONGO_URL).then(() => {
  server.listen(PORT, () => {
    console.log('🚀 Server listening on http://localhost:' + PORT);
  });
});
