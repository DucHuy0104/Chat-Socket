// ─── LOAD USERS ────────────────────────────────────────────
let users = JSON.parse(localStorage.getItem("users") || "{}");

// Hiển thị lỗi
function showError(msg) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.textContent = msg;
  box.style.display = "block";
}

// ─── REGISTER ───────────────────────────────────────────────
function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value.trim();

  // Reset lỗi
  const box = document.getElementById("errorBox");
  box.style.display = "none";
  box.textContent = "";

  // Kiểm tra từng trường
  if (!name) {
    showError("Vui lòng nhập tên hiển thị!");
    return;
  }
  if (!email) {
    showError("Vui lòng nhập email!");
    return;
  }

  // Kiểm tra định dạng email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Email không hợp lệ!");
    return;
  }

  if (!pass) {
    showError("Vui lòng nhập mật khẩu!");
    return;
  }

  // Kiểm tra email đã tồn tại
  if (users[email]) {
    showError("Email đã tồn tại!");
    return;
  }

  // Avatar mặc định
  const avatar = 'default.png';
  saveUser(email, name, pass, avatar);
}

// Lưu user vào localStorage
function saveUser(email, name, pass, avatar) {
  users[email] = { name, pass, avatar };
  localStorage.setItem("users", JSON.stringify(users));

  alert("Đăng ký thành công!");
  window.location.href = "login.html";
}

// ─── LOGIN ─────────────────────────────────────────────────
function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  const box = document.getElementById("errorBox");
  box.style.display = "none";
  box.textContent = "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Email không hợp lệ!");
    return;
  }
  
  if (!pass) {
    showError("Vui lòng nhập mật khẩu!");
    return;
  }

  if (!users[email] || users[email].pass !== pass) {
    showError("Sai email hoặc mật khẩu!");
    return;
  }

  // lưu user đang login
  localStorage.setItem("currentUser", JSON.stringify(users[email]));

  window.location.href = "index.html"; // chuyển sang giao diện chat
}

// ─── HIỆN AVATAR TRÊN NAVBAR ───────────────────────────────
function loadUserToNavbar() {
  const u = JSON.parse(localStorage.getItem("currentUser"));
  const nav = document.getElementById("navUser");

  if (!nav) return;

  if (!u) {
    nav.innerHTML = `<a class="btn" href="login.html">Login</a>`;
  } else {
    nav.innerHTML = `
      <img src="${u.avatar || 'default.png'}" class="avatar">
      <span>${u.name}</span>
    `;
  }
}

// Tự động load navbar khi mở trang
window.addEventListener('DOMContentLoaded', loadUserToNavbar);

// Tạo sao nền tự động
function generateStars(amount = 200) {
    const container = document.querySelector(".stars");
    if (!container) return;

    for (let i = 0; i < amount; i++) {
        const s = document.createElement("div");
        s.className = "star";

        // vị trí random trên màn hình
        s.style.left = Math.random() * 100 + "vw";
        s.style.top = Math.random() * 100 + "vh";

        // độ sáng random (tự nhiên hơn)
        s.style.opacity = 0.3 + Math.random() * 0.7;

        // kích thước sao random
        const size = Math.random() * 2 + 1; 
        s.style.width = size + "px";
        s.style.height = size + "px";

        // tốc độ lấp lánh random
        s.style.animationDuration = (1 + Math.random() * 2) + "s";

        container.appendChild(s);
    }
}

// Tạo sao bắn rơi
function generateShootingStars(amount = 20) {
    const wrap = document.querySelector(".shooting-wrap");
    if (!wrap) return;

    for (let i = 0; i < amount; i++) {
        const st = document.createElement("div");
        st.className = "shooting-star";

        // THÊM: Vị trí ngang ngẫu nhiên (từ 0% đến 100% màn hình)
        st.style.left = Math.random() * 100 + "vw";
        
        // vị trí ngẫu nhiên theo trục dọc (Giữ nguyên)
        st.style.top = Math.random() * 110 + "%";

        // delay random cho mỗi vệt sao
        st.style.animationDelay = (Math.random() * 5).toFixed(2) + "s"

        wrap.appendChild(st);
    }
}

// Khi trang load, tạo luôn sao
document.addEventListener("DOMContentLoaded", () => {
    generateStars(1000);          // nhiều sao hơn
    generateShootingStars(150); // 150 sao bắn rơi
});
