# Socket Chat (Express + Socket.IO + MongoDB)

## Project Overview
Socket Chat là một ứng dụng chat real-time được xây dựng với Express, Socket.IO và MongoDB. Ứng dụng cho phép người dùng:
- Tham gia và quản lý nhiều phòng chat
- Gửi tin nhắn công khai trong phòng
- Gửi tin nhắn riêng 1-1 với người dùng khác
- Xem lịch sử tin nhắn được lưu trữ
- Được thông báo khi người dùng vào/ra phòng

---

## Business Requirements
- Người dùng có thể đặt tên và vào ứng dụng
- Hệ thống hỗ trợ nhiều phòng chat độc lập
- Mỗi tin nhắn phải được lưu lại để xem lịch sử
- Hỗ trợ nhắn tin riêng 1-1 giữa các người dùng
- Hiển thị danh sách người dùng đang online
- Các thông báo hệ thống khi người dùng tham gia/rời phòng
- Lưu trữ dữ liệu người dùng, phòng, và tin nhắn

---

## Actors
1. **User (Người dùng)**: Bất kỳ ai có thể truy cập ứng dụng, đặt tên người dùng và tham gia chat
2. **System Administrator**: Quản lý cơ sở dữ liệu và cấu hình server (có thể mở rộng)

---

## Use Cases
1. **UC1: Đăng nhập / Đặt tên người dùng**
   - Người dùng nhập tên → Hệ thống lưu trữ → Vào ứng dụng

2. **UC2: Tham gia phòng chat**
   - Người dùng chọn/tạo phòng → Hệ thống thêm vào phòng → Gửi thông báo tới thành viên khác

3. **UC3: Gửi tin nhắn công khai (Phòng)**
   - Người dùng nhập tin nhắn → Hệ thống lưu vào DB → Phát tới tất cả thành viên phòng

4. **UC4: Gửi tin nhắn riêng (DM)**
   - Người dùng chọn người nhận → Nhập tin nhắn → Hệ thống lưu và gửi cho người được chỉ định

5. **UC5: Xem lịch sử tin nhắn**
   - Người dùng xem tin nhắn trước đó trong phòng hoặc DM → Hệ thống tải từ DB

6. **UC6: Rời phòng chat**
   - Người dùng rời phòng → Hệ thống thông báo → Cập nhật danh sách thành viên

7. **UC7: Xem danh sách người dùng online**
   - Người dùng xem danh sách → Hệ thống hiển thị người dùng đang kết nối

---

## User Flow
```
1. [Khởi động ứng dụng]
       ↓
2. [Login - Đặt tên người dùng]
       ↓
3. [Chọn phòng hoặc tạo phòng mới]
       ↓
4. [Xem lịch sử tin nhắn phòng (nếu có)]
       ↓
5. [Gửi tin nhắn công khai hoặc chọn người dùng để DM]
       ↓
6. [Lặp lại: Gửi/Nhận tin nhắn]
       ↓
7. [Rời phòng hoặc đóng kết nối]
```

---

## System Architecture
```
┌─────────────────────────────────────────────┐
│           CLIENT SIDE (Browser)              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ index.html   │  │ login.html   │         │
│  │ styles.css   │  │              │         │
│  │ client.js    │  │              │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
          │ Socket.IO (Bi-directional)
          ↓
┌─────────────────────────────────────────────┐
│         SERVER SIDE (Express + Socket.IO)    │
│  ┌──────────────────────────────────────┐   │
│  │ server.js (Main entry point)         │   │
│  │ socket.js (Socket events handler)    │   │
│  │ db.js (Database connection)          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
          │ MongoDB Driver
          ↓
┌─────────────────────────────────────────────┐
│              MONGODB DATABASE                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ User     │  │ Room     │  │ Message  │  │
│  │ Collection│  │Collection│  │Collection│  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

---

## Database / ERD

### User Collection
```json
{
  "_id": ObjectId,
  "username": "string",
  "socketId": "string",
  "isOnline": boolean,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Room Collection
```json
{
  "_id": ObjectId,
  "name": "string",
  "description": "string",
  "members": [ObjectId],
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Message Collection
```json
{
  "_id": ObjectId,
  "sender": ObjectId (ref: User),
  "roomId": ObjectId (ref: Room) | null,  // null nếu là tin nhắn riêng
  "receiver": ObjectId (ref: User) | null,  // null nếu là tin nhắn phòng
  "content": "string",
  "type": "public|private",
  "createdAt": ISODate
}
```

### ERD Diagram
```
┌──────────┐         ┌─────────────┐         ┌──────────┐
│   User   │────────│   Message   │────────│   Room   │
├──────────┤        ├─────────────┤        ├──────────┤
│ _id      │◄───┐   │ _id         │        │ _id      │
│ username │    └──│ sender      │        │ name     │
│ socketId │       │ content     │   ┌───│ members  │
│ isOnline │       │ type        │   │   └──────────┘
│ createdAt│       │ roomId      │───┤
│ updatedAt│       │ receiver    │───┘
└──────────┘       │ createdAt   │
                   └─────────────┘
```

---

## Screenshots
*(Thêm hình ảnh khi có sẵn)*

- **Login Screen**: Giao diện đặt tên người dùng
- **Chat Room**: Giao diện chat với danh sách phòng, tin nhắn, và danh sách người dùng online
- **Private Messages**: Tab nhắn tin riêng 1-1
- **Room History**: Lịch sử tin nhắn phòng

---

## Installation

### Yêu cầu môi trường
- Node.js 18+
- MongoDB đang chạy (local hoặc Atlas)

### Các bước cài đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd Chat-Socket
```

2. **Cài đặt dependencies**
```bash
cd chat_socket
npm install
```

3. **Cấu hình môi trường**
```bash
cp .env.example .env
# Sửa .env nếu cần (MongoDB URI, Port, ...)
```

4. **Chạy ứng dụng**
```bash
# Chế độ phát triển (với nodemon)
npm run dev

# Hoặc chế độ sản xuất
npm start
```

5. **Mở trình duyệt**
```
http://localhost:3000
```

### Cấu trúc thư mục
```
chat_socket/
├── public/
│   ├── index.html        # Giao diện chat chính
│   ├── login.html        # Giao diện đăng nhập
│   ├── styles.css        # CSS styling
│   └── client.js         # Client-side Socket.IO logic
├── src/
│   ├── server.js         # Express server setup
│   ├── socket.js         # Socket.IO event handlers
│   ├── db.js             # MongoDB connection
│   └── models/
│       ├── User.js       # User schema
│       ├── Room.js       # Room schema
│       └── Message.js    # Message schema
├── uploads/              # Folder lưu file (nếu cần)
├── package.json
└── .env                  # Environment variables
```

### Tính năng đã triển khai
- ✅ Đặt tên người dùng khi vào
- ✅ Thông báo người dùng vào/ra phòng
- ✅ Nhiều phòng chat (join/leave room)
- ✅ Nhắn tin phòng (public)
- ✅ Nhắn tin riêng 1-1 (private)
- ✅ Lưu lịch sử tin nhắn vào MongoDB
- ✅ API lấy lịch sử phòng và lịch sử 1-1
- ✅ Danh sách người dùng đang online

### Ghi chú
- Mặc định tạo phòng `general`. Bạn có thể tạo phòng mới ở client.
- Lịch sử phòng khi vào sẽ tải 50 tin gần nhất.
- Lịch sử DM tải ở tab DM khi chọn 1 người dùng.
