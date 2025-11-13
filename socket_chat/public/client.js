const socket = io();
let username = '';
let currentRoom = 'general';
let dmTarget = '';

const $ = (q) => document.querySelector(q);
const messages = $('#messages');
const input = $('#input');
const form = $('#form');
const roomsBox = $('#rooms');
const usersBox = $('#usersOnline');
const me = $('#me');
const target = $('#target');
const currentRoomEl = $('#currentRoom');

function appendMessage({ content, sender, createdAt, isPrivate, system }, css = '') {
  const li = document.createElement('li');
  if (css) li.classList.add(css);
  if (system) { li.classList.add('system'); li.textContent = content; }
  else {
    const time = new Date(createdAt).toLocaleTimeString();
    const prefix = isPrivate ? `[DM] ${sender}` : `${sender}`;
    li.innerHTML = `<strong>${prefix}</strong>: ${content} <small>(${time})</small>`;
    if (sender === username) li.classList.add('me');
  }
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function setTargetRoom(r) {
  dmTarget = '';
  currentRoom = r;
  currentRoomEl.textContent = r;
  target.textContent = `Room: ${r}`;
  Array.from(roomsBox.children).forEach(el => el.classList.toggle('active', el.dataset.room === r));
}

function setTargetDM(u) {
  dmTarget = u;
  target.textContent = `DM với: ${u}`;
}

async function boot() {
  username = prompt('Nhập tên của bạn:') || ('user' + Math.floor(Math.random()*1000));
  me.textContent = 'Bạn: ' + username;
  socket.emit('set_username', username, (res) => {
    if (!res.ok) return alert(res.error || 'Không vào được');
    ['general'].concat(res.rooms.filter(x => x !== 'general')).forEach(addRoom);
    setTargetRoom('general');
    refreshUsers(res.usersOnline || []);
    loadRoomHistory('general');
  });
}
boot();

function addRoom(name) {
  if (Array.from(roomsBox.children).some(el => el.dataset.room === name)) return;
  const div = document.createElement('div');
  div.textContent = name;
  div.className = 'room';
  div.dataset.room = name;
  div.onclick = () => joinRoom(name);
  roomsBox.appendChild(div);
}
function refreshUsers(list) {
  usersBox.innerHTML = '';
  list.filter(u => u !== username).forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    li.onclick = () => setTargetDM(u);
    usersBox.appendChild(li);
  });
}
async function loadRoomHistory(room) {
  messages.innerHTML = '';
  const res = await fetch(`/api/rooms/${encodeURIComponent(room)}/messages?limit=50`);
  const data = await res.json();
  data.forEach(m => appendMessage(m));
}
function joinRoom(room) {
  socket.emit('join_room', room, (res) => {
    if (!res.ok) return;
    addRoom(room);
    setTargetRoom(room);
    messages.innerHTML = '';
    (res.history || []).forEach(m => appendMessage(m));
  });
}
$('#btnCreateRoom').onclick = () => {
  const name = $('#roomName').value.trim();
  if (name) joinRoom(name);
};

$('#toGeneral').onclick = () => {
  setTargetRoom('general');
  loadRoomHistory('general');
};

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  if (dmTarget) {
    socket.emit('private_message', { to: dmTarget, content: text }, (ack) => {});
  } else {
    socket.emit('chat_message', { room: currentRoom, content: text }, (ack) => {});
  }
  input.value = '';
  input.focus();
});

socket.on('chat_message', (payload) => {
  appendMessage(payload);
});

socket.on('private_message', (payload) => {
  appendMessage(payload, payload.sender === username ? 'me' : '');
});

socket.on('system', (text) => {
  appendMessage({ content: text, system: true });
});

socket.on('users_online', (list) => {
  refreshUsers(list || []);
});
