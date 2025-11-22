const socket = io();

// --- 1. KIỂM TRA ĐĂNG NHẬP ---
// Lấy tên đã lưu trong localStorage (từ file login.html)
const storedName = localStorage.getItem('chat_username');

if (!storedName) {
  // Chưa đăng nhập -> chuyển về trang login
  window.location.href = 'login.html';
} else {
  // Đã có tên -> Chạy hàm khởi động
  boot(storedName);
}

// --- 2. KHAI BÁO BIẾN ---
let username = '';
let currentRoom = 'general';
let dmTarget = '';
let typingTimeout = null;

const $ = (q) => document.querySelector(q);
const messages = $('#messages');
const input = $('#input');
const form = $('#form');
const roomsBox = $('#rooms');
const usersBox = $('#usersOnline');
const me = $('#me');
const target = $('#target');
const typingStatus = $('#typingStatus');
const fileInput = $('#fileInput');
const fileUploadBtn = $('#fileUploadBtn');
const btnLogout = $('#btnLogout');

// --- 3. LOGIC KHỞI ĐỘNG ---
async function boot(name) {
  socket.emit('set_username', name, (res) => {
    if (!res.ok) {
      alert(res.error || 'Tên này không hợp lệ hoặc đã có người dùng!');
      localStorage.removeItem('chat_username');
      window.location.href = 'login.html';
      return;
    }

    username = name;
    me.textContent = username;

    // Tải danh sách phòng và vào phòng general
    ['general'].concat(res.rooms.filter(x => x !== 'general')).forEach(addRoom);
    setTargetRoom('general');
    refreshUsers(res.usersOnline || []);
    loadRoomHistory('general');
  });
}

// --- 4. HÀM XỬ LÝ HIỂN THỊ ---

// Kiểm tra đuôi file có phải ảnh không
function isImage(filename) {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
}

function appendMessage({ _id, content, sender, createdAt, isPrivate, system, readBy }, css = '') {
  const li = document.createElement('li');
  if (_id) li.dataset.id = _id;
  if (css) li.classList.add(css);
  if (!system) {
  li.setAttribute("data-sender-initial", sender.charAt(0).toUpperCase());
}


  if (system) {
    li.classList.add('system');
    li.innerHTML = `<i class='bx bx-info-circle'></i> ${content}`;
  } else {
    const time = createdAt ? new Date(createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const prefix = isPrivate ? `[DM] ${sender}` : sender;
    
    if (sender === username) li.classList.add('me');

    li.innerHTML = `
        <strong>${prefix}</strong>
        ${content}
        <small style="display:block; margin-top:4px; font-size:0.7em; opacity:0.6; text-align:right;">${time}</small>
    `;

    // Hiển thị "Đã xem"
    if (sender === username && Array.isArray(readBy) && readBy.length > 0) {
      const readEl = document.createElement('div');
      readEl.className = 'read-flag';
      readEl.textContent = 'Đã xem';
      li.appendChild(readEl);
    }
  }
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// --- 5. SOCKET EVENTS (NHẬN TIN) ---

socket.on('chat_message', (payload) => {
  appendMessage(payload);
  // Nếu nhận tin người khác trong phòng hiện tại -> báo đã đọc
  if (payload.sender !== username && payload.room === currentRoom && payload._id) {
    socket.emit('message_read', { messageId: payload._id });
  }
});

socket.on('private_message', (payload) => {
  appendMessage(payload, payload.sender === username ? 'me' : '');
  if (payload.sender !== username && payload._id) {
    socket.emit('message_read', { messageId: payload._id });
  }
});

// NHẬN FILE HOẶC ẢNH
socket.on('fileMessage', ({ username: sender, url, original, size, timestamp }) => {
  const sizeMB = (size / (1024 * 1024)).toFixed(2);
  const li = document.createElement('li');
  if (sender === username) li.classList.add('me');

  let contentHtml = '';
  if (isImage(original)) {
    // Nếu là ảnh: Hiển thị thẻ IMG
    contentHtml = `
      <div class="msg-image-container">
        <a href="${url}" target="_blank">
          <img src="${url}" alt="${original}" class="msg-image" />
        </a>
      </div>`;
  } else {
    // Nếu là file khác: Hiển thị link tải
    contentHtml = `
      <div class="msg-file">
        <i class='bx bx-file'></i> 
        <a href="${url}" target="_blank">${original}</a> 
        <span>(${sizeMB} MB)</span>
      </div>`;
  }

  li.innerHTML = `
    ${sender !== username ? `<strong>${sender}</strong>` : ''}
    ${contentHtml}
    <small style="display:block; margin-top:5px; font-size:0.7em; opacity:0.7; text-align:right;">
        ${new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
    </small>
  `;
  
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('typing', ({ room, username: user, isTyping }) => {
  if (room !== currentRoom) return;
  typingStatus.textContent = isTyping ? `${user} đang soạn tin...` : '';
});

socket.on('users_online', (list) => refreshUsers(list || []));
socket.on('system', (text) => appendMessage({ content: text, system: true }));

socket.on('message_read', ({ messageId }) => {
    const li = document.querySelector(`li[data-id="${messageId}"]`);
    if (li && li.classList.contains('me') && !li.querySelector('.read-flag')) {
        const flag = document.createElement('div');
        flag.className = 'read-flag';
        flag.textContent = 'Đã xem';
        li.appendChild(flag);
    }
});

// --- 6. CÁC HÀM HỖ TRỢ (ROOM, USER LIST) ---
function setTargetRoom(r) {
  dmTarget = '';
  currentRoom = r;
  target.textContent = `Room: ${r}`;
  Array.from(roomsBox.children).forEach(el => el.classList.toggle('active', el.dataset.room === r));
}

function setTargetDM(u) {
  dmTarget = u;
  target.textContent = `DM: ${u}`;
}

function addRoom(name) {
  if (Array.from(roomsBox.children).some(el => el.dataset.room === name)) return;
  const div = document.createElement('div');
  div.innerHTML = `<i class='bx bx-hash'></i> ${name}`;
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
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(room)}/messages?limit=50`);
    const data = await res.json();
    if(Array.isArray(data)) data.forEach(m => appendMessage(m));
  } catch (e) { console.error(e); }
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

// --- 7. SỰ KIỆN NGƯỜI DÙNG ---

// Tạo phòng
$('#btnCreateRoom').onclick = () => {
  const name = $('#roomName').value.trim();
  if (name) { joinRoom(name); $('#roomName').value = ''; }
};

// Về sảnh
$('#toGeneral').onclick = () => { setTargetRoom('general'); loadRoomHistory('general'); };

// Đăng xuất
if (btnLogout) {
    btnLogout.onclick = () => {
        if(confirm('Bạn muốn đăng xuất?')) {
            localStorage.removeItem('chat_username');
            window.location.href = 'login.html';
        }
    }
}

// Gửi tin nhắn
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  if (dmTarget) socket.emit('private_message', { to: dmTarget, content: text }, () => {});
  else socket.emit('chat_message', { room: currentRoom, content: text }, () => {});

  input.value = '';
  input.focus();
  socket.emit('typing', { room: currentRoom, isTyping: false });
});

// Báo đang gõ
input.addEventListener('input', () => {
  if (!currentRoom) return;
  socket.emit('typing', { room: currentRoom, isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', { room: currentRoom, isTyping: false }), 800);
});

// Upload File
if (fileUploadBtn) fileUploadBtn.onclick = () => fileInput && fileInput.click();
if (fileInput) {
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('room', currentRoom);
    formData.append('username', username);
    try {
      const res = await fetch('/upload-file', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.ok) alert('Lỗi upload: ' + (data.message || 'Thất bại'));
      fileInput.value = '';
    } catch (err) { alert('Lỗi upload: ' + err.message); }
  };
}
// Toggle Dark/Light Mode
const toggleBtn = document.getElementById("toggleMode");

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", theme);

    toggleBtn.innerHTML = theme === "dark" 
      ? "<i class='bx bx-sun'></i>" 
      : "<i class='bx bx-moon'></i>";
  });

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    toggleBtn.innerHTML = "<i class='bx bx-sun'></i>";
  }
  // ==== AVATAR: HIỂN THỊ & CHỈNH SỬA TRONG PHÒNG CHAT ====

// Lấy các phần tử liên quan
const avatarCircle = document.querySelector('.avatar-circle');
const avatarMenu = document.getElementById('avatarMenu');
const avatarMenuChoose = document.getElementById('avatarMenuChoose');
const avatarMenuClear = document.getElementById('avatarMenuClear');
const avatarMenuInput = document.getElementById('avatarMenuInput');

// Hàm áp dụng avatar vào vòng tròn trên sidebar
function applyAvatar(avatarDataUrl) {
  if (!avatarCircle) return;
  if (avatarDataUrl) {
    avatarCircle.style.backgroundImage = `url(${avatarDataUrl})`;
    avatarCircle.style.backgroundSize = 'cover';
    avatarCircle.style.backgroundPosition = 'center';
    avatarCircle.innerHTML = ''; // tắt icon user mặc định
  } else {
    avatarCircle.style.backgroundImage = 'none';
    avatarCircle.innerHTML = "<i class='bx bxs-user'></i>";
  }
}

// Load avatar đã lưu (nếu có)
const storedAvatar = localStorage.getItem('chat_avatar');
applyAvatar(storedAvatar);

// Click vào avatar để mở/đóng menu
if (avatarCircle && avatarMenu) {
  avatarCircle.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.style.display = avatarMenu.style.display === 'block' ? 'none' : 'block';
  });

  // Click ra ngoài thì đóng menu
  document.addEventListener('click', (e) => {
    if (!avatarMenu.contains(e.target) && !avatarCircle.contains(e.target)) {
      avatarMenu.style.display = 'none';
    }
  });

  // Chọn ảnh mới
  avatarMenuChoose.addEventListener('click', () => {
    avatarMenuInput.click();
  });

  avatarMenuInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem('chat_avatar', dataUrl);
      applyAvatar(dataUrl);
      avatarMenu.style.display = 'none';
      avatarMenuInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  // Xóa avatar hiện tại
  avatarMenuClear.addEventListener('click', () => {
    localStorage.removeItem('chat_avatar');
    applyAvatar(null);
    avatarMenu.style.display = 'none';
  });
}

}
