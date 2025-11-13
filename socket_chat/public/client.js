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

// ⭐ mới: chỗ hiển thị "đang gõ..."
const typingStatus = $('#typingStatus');
let typingTimeout = null;

// ⭐ appendMessage có thêm _id, readBy
function appendMessage(
  { _id, content, sender, createdAt, isPrivate, system, readBy, room },
  css = ''
) {
  const li = document.createElement('li');

  if (_id) {
    li.dataset.id = _id; // để update "Đã đọc" sau này
  }

  if (css) li.classList.add(css);

  if (system) {
    li.classList.add('system');
    li.textContent = content;
  } else {
    const time = createdAt ? new Date(createdAt).toLocaleTimeString() : '';
    const prefix = isPrivate ? `[DM] ${sender}` : `${sender}`;
    li.innerHTML = `<strong>${prefix}</strong>: ${content}${
      time ? ` <small>(${time})</small>` : ''
    }`;

    if (sender === username) li.classList.add('me');

    // ⭐ nếu là tin mình gửi và đã có người đọc -> hiện "Đã đọc"
    if (
      sender === username &&
      Array.isArray(readBy) &&
      readBy.length > 0
    ) {
      const readEl = document.createElement('div');
      readEl.className = 'read-flag';
      readEl.textContent = 'Đã đọc';
      li.appendChild(readEl);
    }
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

function setTargetRoom(r) {
  dmTarget = '';
  currentRoom = r;
  currentRoomEl.textContent = r;
  target.textContent = `Room: ${r}`;
  Array.from(roomsBox.children).forEach((el) =>
    el.classList.toggle('active', el.dataset.room === r)
  );
}

function setTargetDM(u) {
  dmTarget = u;
  target.textContent = `DM với: ${u}`;
}

async function boot() {
  username =
    prompt('Nhập tên của bạn:') || 'user' + Math.floor(Math.random() * 1000);
  me.textContent = 'Bạn: ' + username;
  socket.emit('set_username', username, (res) => {
    if (!res.ok) return alert(res.error || 'Không vào được');
    ['general']
      .concat(res.rooms.filter((x) => x !== 'general'))
      .forEach(addRoom);
    setTargetRoom('general');
    refreshUsers(res.usersOnline || []);
    loadRoomHistory('general');
  });
}
boot();

function addRoom(name) {
  if (Array.from(roomsBox.children).some((el) => el.dataset.room === name))
    return;
  const div = document.createElement('div');
  div.textContent = name;
  div.className = 'room';
  div.dataset.room = name;
  div.onclick = () => joinRoom(name);
  roomsBox.appendChild(div);
}

function refreshUsers(list) {
  usersBox.innerHTML = '';
  list
    .filter((u) => u !== username)
    .forEach((u) => {
      const li = document.createElement('li');
      li.textContent = u;
      li.onclick = () => setTargetDM(u);
      usersBox.appendChild(li);
    });
}

async function loadRoomHistory(room) {
  messages.innerHTML = '';
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(room)}/messages?limit=50`
  );
  const data = await res.json();
  data.forEach((m) => appendMessage(m));
}

function joinRoom(room) {
  socket.emit('join_room', room, (res) => {
    if (!res.ok) return;
    addRoom(room);
    setTargetRoom(room);
    messages.innerHTML = '';
    (res.history || []).forEach((m) => appendMessage(m));
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

// ✍️ gửi tin nhắn
form.addEventListener('submit', function (e) {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  if (dmTarget) {
    socket.emit('private_message', { to: dmTarget, content: text }, (ack) => {});
  } else {
    socket.emit(
      'chat_message',
      { room: currentRoom, content: text },
      (ack) => {}
    );
  }

  input.value = '';
  input.focus();

  // Khi gửi xong thì coi như không còn "đang gõ"
  socket.emit('typing', { room: currentRoom, isTyping: false });
});

// ⭐ "Đang gõ..." – emit typing khi user gõ vào input
input.addEventListener('input', () => {
  if (!currentRoom) return;

  // báo đang gõ
  socket.emit('typing', { room: currentRoom, isTyping: true });

  // nếu sau 800ms không gõ nữa thì báo dừng
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { room: currentRoom, isTyping: false });
  }, 800);
});

// 💬 nhận tin nhắn trong room
socket.on('chat_message', (payload) => {
  appendMessage(payload);

  // ⭐ nếu là tin nhắn của người khác, đang ở đúng room -> gửi "đã đọc"
  if (
    payload.sender !== username &&
    payload.room === currentRoom &&
    payload._id
  ) {
    socket.emit('message_read', { messageId: payload._id });
  }
});

// 🔐 nhận tin nhắn private
socket.on('private_message', (payload) => {
  appendMessage(payload, payload.sender === username ? 'me' : '');

  // ⭐ nếu là tin người khác gửi cho mình -> báo đã đọc
  if (payload.sender !== username && payload._id) {
    socket.emit('message_read', { messageId: payload._id });
  }
});

// 👀 update UI khi server báo tin nhắn đã đọc
socket.on('message_read', ({ messageId, readBy }) => {
  if (!messageId) return;
  const li = document.querySelector(`li[data-id="${messageId}"]`);
  if (!li) return;

  // chỉ quan tâm nếu đây là tin mình gửi
  const isMine = li.classList.contains('me');
  if (!isMine) return;

  let flag = li.querySelector('.read-flag');
  if (!flag) {
    flag = document.createElement('div');
    flag.className = 'read-flag';
    li.appendChild(flag);
  }
  flag.textContent = 'Đã đọc';
});

// ✍️ nhận trạng thái "đang gõ..."
socket.on('typing', ({ room, username: user, isTyping }) => {
  if (room !== currentRoom) return;

  if (isTyping) {
    typingStatus.textContent = `${user} đang gõ...`;
  } else {
    typingStatus.textContent = '';
  }
});

// hệ thống & online
socket.on('system', (text) => {
  appendMessage({ content: text, system: true });
});

socket.on('users_online', (list) => {
  refreshUsers(list || []);
});
