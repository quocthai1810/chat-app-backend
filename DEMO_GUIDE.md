# 📱 Chat App Backend - Hướng Dẫn Demo Chi Tiết

## 📋 Mục Lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt và khởi chạy](#2-cài-đặt-và-khởi-chạy)
3. [Swagger UI - Công cụ test API](#3-swagger-ui---công-cụ-test-api)
4. [Demo Flow](#4-demo-flow)
5. [Test WebSocket Real-time](#5-test-websocket-real-time)
6. [Danh sách API đầy đủ](#6-danh-sách-api-đầy-đủ)
7. [Xử lý lỗi thường gặp](#7-xử-lý-lỗi-thường-gặp)

---

## 1. Yêu cầu hệ thống

- **Node.js**: v18 trở lên
- **npm**: v9 trở lên
- **Trình duyệt**: Chrome, Firefox, Edge

Kiểm tra phiên bản (mở PowerShell hoặc Command Prompt):
```
node -v
npm -v
```

---

## 2. Cài đặt và khởi chạy

### 2.1. Cài đặt dependencies

Mở Terminal trong VS Code hoặc PowerShell:
```
cd c:\Users\thai0\OneDrive\Desktop\chat_app_backend
npm install
```

### 2.2. Khởi chạy server

```
npm run start:dev
```

✅ **Thành công khi thấy:**
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG Application is running on: http://localhost:3000
[Nest] LOG Swagger documentation available at: http://localhost:3000/api
```

### 2.3. Mở Swagger UI

Mở trình duyệt và truy cập: **http://localhost:3000/api**

---

## 3. Swagger UI - Công cụ test API

### 3.1. Giao diện Swagger

Khi mở http://localhost:3000/api, bạn sẽ thấy:

```
┌─────────────────────────────────────────────────────────────┐
│  Chat App Backend API                                       │
├─────────────────────────────────────────────────────────────┤
│  ▼ Users         - Quản lý người dùng                       │
│  ▼ Conversations - Quản lý cuộc trò chuyện                  │
│  ▼ Messages      - Gửi/nhận tin nhắn                        │
│  ▼ Upload        - Upload file, ảnh, video                  │
│  ▼ Organizations - Quản lý phòng ban, dự án                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. Cách sử dụng Swagger

**Bước 1:** Click vào nhóm API (ví dụ: `Users`)

**Bước 2:** Click vào API cụ thể (ví dụ: `POST /users`)

**Bước 3:** Click nút **"Try it out"** (góc phải)

**Bước 4:** Điền dữ liệu vào ô **Request body**

**Bước 5:** Click nút **"Execute"**

**Bước 6:** Xem kết quả ở phần **Response**

---

## 4. Demo Flow

### 📝 Demo 1: Chat 1-1 cơ bản

#### Bước 1: Tạo User 1

1. Mở Swagger: http://localhost:3000/api
2. Click **Users** → **POST /users**
3. Click **"Try it out"**
4. Nhập Request body:
```json
{
  "username": "nguyen.vana",
  "displayName": "Nguyen Van A"
}
```
5. Click **"Execute"**
6. **📋 Copy `id` từ Response** (ví dụ: `"id": "a1b2c3d4-..."`)

#### Bước 2: Tạo User 2

1. Vẫn ở **POST /users**
2. Nhập Request body:
```json
{
  "username": "tran.vanb",
  "displayName": "Tran Van B"
}
```
3. Click **"Execute"**
4. **📋 Copy `id` từ Response**

> 💡 **Lưu ý:** Ghi lại 2 ID này vào Notepad để dùng tiếp!

#### Bước 3: Tạo Conversation (Chat 1-1)

1. Click **Conversations** → **POST /conversations**
2. Click **"Try it out"**
3. Nhập Request body (thay USER1_ID và USER2_ID):
```json
{
  "type": "PRIVATE",
  "participantIds": ["USER1_ID", "USER2_ID"],
  "creatorId": "USER1_ID"
}
```
4. Click **"Execute"**
5. **📋 Copy `id` của conversation**

#### Bước 4: Gửi tin nhắn

1. Click **Messages** → **POST /messages**
2. Click **"Try it out"**
3. Nhập Request body:
```json
{
  "conversationId": "CONVERSATION_ID",
  "senderId": "USER1_ID",
  "content": "Xin chào, bạn khỏe không?",
  "type": "TEXT"
}
```
4. Click **"Execute"**
5. ✅ Tin nhắn đã được gửi!

#### Bước 5: User 2 trả lời

1. Vẫn ở **POST /messages**
2. Nhập Request body:
```json
{
  "conversationId": "CONVERSATION_ID",
  "senderId": "USER2_ID",
  "content": "Chào bạn, mình khỏe. Bạn thì sao?",
  "type": "TEXT"
}
```
3. Click **"Execute"**

#### Bước 6: Xem lịch sử tin nhắn

1. Click **Messages** → **GET /messages/conversation/{conversationId}**
2. Click **"Try it out"**
3. Nhập:
   - `conversationId`: ID conversation
   - `userId`: USER1_ID
4. Click **"Execute"**
5. ✅ Xem danh sách tin nhắn trong Response!

---

### 📝 Demo 2: Group Chat

#### Bước 1: Tạo thêm User 3

1. **POST /users** với body:
```json
{
  "username": "le.vanc",
  "displayName": "Le Van C"
}
```

#### Bước 2: Tạo Group

1. **POST /conversations** với body:
```json
{
  "type": "GROUP",
  "category": "TEAM",
  "name": "Nhóm Dự Án ABC",
  "participantIds": ["USER1_ID", "USER2_ID", "USER3_ID"],
  "creatorId": "USER1_ID"
}
```

#### Bước 3: Gửi tin nhắn vào Group

1. **POST /messages** với body:
```json
{
  "conversationId": "GROUP_CONV_ID",
  "senderId": "USER1_ID",
  "content": "Chào mọi người trong nhóm!",
  "type": "TEXT"
}
```

---

### 📝 Demo 3: Upload Ảnh

1. Click **Upload** → **POST /upload/image**
2. Click **"Try it out"**
3. Điền:
   - **file**: Click "Choose File" và chọn ảnh từ máy
   - **conversationId**: ID cuộc trò chuyện
   - **senderId**: ID người gửi
   - **content**: Caption (tùy chọn, ví dụ: "Ảnh đẹp quá!")
4. Click **"Execute"**
5. ✅ Ảnh được upload và gửi như tin nhắn!

---

### 📝 Demo 4: Upload File tài liệu

1. Click **Upload** → **POST /upload/file**
2. Click **"Try it out"**
3. Điền:
   - **file**: Chọn file PDF, Word, Excel...
   - **conversationId**: ID cuộc trò chuyện
   - **senderId**: ID người gửi
4. Click **"Execute"**

> 📎 Hỗ trợ: PDF, Word, Excel, PowerPoint, Text, CSV, ZIP (max 25MB)

---

### 📝 Demo 5: Upload Video

1. Click **Upload** → **POST /upload/video**
2. Click **"Try it out"**
3. Điền:
   - **file**: Chọn file video (MP4, WebM, MOV...)
   - **conversationId**: ID cuộc trò chuyện
   - **senderId**: ID người gửi
4. Click **"Execute"**

> 🎬 Hỗ trợ: MP4, WebM, MOV, AVI, MKV (max 100MB)

---

### 📝 Demo 6: Reply tin nhắn

1. **POST /messages** với body:
```json
{
  "conversationId": "CONVERSATION_ID",
  "senderId": "USER2_ID",
  "content": "Đây là tin nhắn trả lời",
  "type": "TEXT",
  "replyToMessageId": "MESSAGE_ID_CẦN_REPLY"
}
```

---

### 📝 Demo 7: Reaction tin nhắn

**Thêm reaction 👍:**
1. Click **Messages** → **POST /messages/{messageId}/reactions**
2. Nhập `messageId`
3. Body:
```json
{
  "userId": "USER1_ID",
  "emoji": "👍"
}
```

**Xóa reaction:**
1. Click **DELETE /messages/{messageId}/reactions**
2. Body tương tự

---

### 📝 Demo 8: Sửa tin nhắn

1. Click **Messages** → **PUT /messages/{messageId}**
2. Nhập `messageId`
3. Body:
```json
{
  "content": "Nội dung đã chỉnh sửa",
  "userId": "USER1_ID"
}
```

---

### 📝 Demo 9: Xóa tin nhắn

1. Click **Messages** → **DELETE /messages/{messageId}**
2. Nhập:
   - `messageId`: ID tin nhắn cần xóa
   - `userId`: ID người xóa (phải là người gửi)
3. Click **"Execute"**

---

### 📝 Demo 10: Tìm kiếm tin nhắn

**Tìm trong 1 conversation:**
1. Click **GET /messages/conversation/{conversationId}/search**
2. Nhập:
   - `conversationId`: ID conversation
   - `userId`: ID user
   - `keyword`: Từ khóa cần tìm (ví dụ: "chào")
3. Click **"Execute"**

**Tìm toàn bộ:**
1. Click **GET /messages/search**
2. Nhập:
   - `userId`: ID user
   - `keyword`: Từ khóa

---

### 📝 Demo 11: Forward tin nhắn

1. Click **POST /messages/{messageId}/forward**
2. Nhập `messageId`
3. Body:
```json
{
  "targetConversationId": "CONVERSATION_KHÁC",
  "forwarderId": "USER1_ID"
}
```

---

### 📝 Demo 12: Xem Media Gallery

**Xem tất cả ảnh trong conversation:**
1. Click **GET /messages/conversation/{conversationId}/media/images**
2. Nhập `conversationId` và `userId`

**Xem tất cả video:**
- **GET /messages/conversation/{conversationId}/media/videos**

**Xem tất cả files:**
- **GET /messages/conversation/{conversationId}/media/files**

**Xem tất cả links:**
- **GET /messages/conversation/{conversationId}/media/links**

---

## 5. Test WebSocket Real-time

### 5.1. Tạo file test

Tạo file `test-chat.html` trên Desktop với nội dung:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Chat WebSocket Test</title>
  <style>
    body { font-family: Arial; padding: 20px; max-width: 800px; margin: auto; }
    #messages { border: 1px solid #ccc; height: 300px; overflow-y: auto; padding: 10px; margin: 10px 0; }
    .msg { padding: 8px; margin: 5px 0; background: #f0f0f0; border-radius: 5px; }
    .mine { background: #007bff; color: white; text-align: right; }
    .system { color: #888; text-align: center; font-size: 12px; }
    input { padding: 10px; width: 60%; }
    button { padding: 10px 15px; cursor: pointer; margin: 2px; }
    .config { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
    .config input { width: auto; margin: 5px; }
    .status { font-weight: bold; }
    .online { color: green; }
    .offline { color: red; }
  </style>
</head>
<body>
  <h1>🚀 Test Chat Real-time</h1>
  
  <div class="config">
    <h3>⚙️ Cấu hình (lấy từ Swagger):</h3>
    <input type="text" id="userId" placeholder="Paste User ID"><br>
    <input type="text" id="convId" placeholder="Paste Conversation ID"><br>
    <button onclick="connect()">🔌 Kết nối</button>
    <span id="status" class="status"></span>
  </div>

  <div id="messages"></div>
  <div id="typing" style="color:#888; font-style:italic; height:20px;"></div>
  
  <input type="text" id="input" placeholder="Nhập tin nhắn..." onkeypress="if(event.key==='Enter')send()">
  <button onclick="send()">📤 Gửi</button>
  <button onclick="markRead()">✅ Đã đọc</button>

  <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
  <script>
    let socket, me, conv, typingTimer;

    function log(text, isSystem = false) {
      const div = document.createElement('div');
      div.className = isSystem ? 'system' : 'msg';
      div.innerHTML = text;
      document.getElementById('messages').appendChild(div);
      document.getElementById('messages').scrollTop = 9999;
    }

    function connect() {
      me = document.getElementById('userId').value.trim();
      conv = document.getElementById('convId').value.trim();
      if (!me || !conv) return alert('Nhập User ID và Conversation ID!');

      socket = io('http://localhost:3000/chat', { query: { userId: me } });

      socket.on('connect', () => {
        document.getElementById('status').innerHTML = '<span class="online">✅ Đã kết nối</span>';
        log('--- Đã kết nối WebSocket ---', true);
        socket.emit('joinConversation', { conversationId: conv });
      });

      socket.on('joinedConversation', () => log('--- Đã vào phòng chat ---', true));

      socket.on('newMessage', (m) => {
        const mine = m.senderId === me;
        log(`<div class="msg ${mine?'mine':''}">${mine?'Bạn':m.senderId}: ${m.content || '[File]'}</div>`);
      });

      socket.on('userTyping', (d) => {
        document.getElementById('typing').textContent = d.isTyping && d.userId !== me ? d.userId + ' đang nhập...' : '';
      });

      socket.on('messagesRead', (d) => log(`--- ${d.readBy} đã đọc ---`, true));
      socket.on('userOnline', (d) => log(`--- ${d.userId} online ---`, true));
      socket.on('userOffline', (d) => log(`--- ${d.userId} offline ---`, true));
      socket.on('disconnect', () => {
        document.getElementById('status').innerHTML = '<span class="offline">❌ Mất kết nối</span>';
      });
    }

    async function send() {
      const msg = document.getElementById('input').value.trim();
      if (!msg) return;
      
      await fetch('http://localhost:3000/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv, senderId: me, content: msg, type: 'TEXT' })
      });
      document.getElementById('input').value = '';
    }

    function markRead() {
      socket?.emit('markAsRead', { conversationId: conv });
      log('--- Đã đánh dấu đã đọc ---', true);
    }

    document.getElementById('input').addEventListener('input', () => {
      socket?.emit('typing', { conversationId: conv, isTyping: true });
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => socket?.emit('typing', { conversationId: conv, isTyping: false }), 2000);
    });
  </script>
</body>
</html>
```

### 5.2. Hướng dẫn test Real-time

1. **Mở 2 cửa sổ trình duyệt** (hoặc 2 tab)
2. **Cửa sổ 1:**
   - Mở file `test-chat.html`
   - Paste User1 ID và Conversation ID
   - Click "Kết nối"
3. **Cửa sổ 2:**
   - Mở file `test-chat.html`
   - Paste User2 ID và CÙNG Conversation ID
   - Click "Kết nối"
4. **Test:**
   - Gõ tin nhắn ở cửa sổ 1 → Cửa sổ 2 nhận được ngay!
   - Gõ chữ → Cửa sổ kia hiện "đang nhập..."
   - Click "Đã đọc" → Cửa sổ kia hiện thông báo

---

## 6. Danh sách API đầy đủ

### Users
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /users | Tạo user |
| GET | /users | Lấy tất cả users |
| GET | /users/:id | Lấy user theo ID |
| PUT | /users/:id | Cập nhật user |
| PUT | /users/:id/status | Cập nhật trạng thái |
| DELETE | /users/:id | Xóa user |

### Conversations
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /conversations | Tạo conversation |
| GET | /conversations | Lấy danh sách (cần userId) |
| GET | /conversations/:id | Lấy chi tiết |
| POST | /conversations/:id/participants | Thêm thành viên |
| DELETE | /conversations/:id/participants/:userId | Xóa thành viên |
| PUT | /conversations/:id | Cập nhật group |
| PUT | /conversations/:id/role | Đổi role |

### Messages
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /messages | Gửi tin nhắn |
| GET | /messages/conversation/:id | Lấy tin nhắn |
| PUT | /messages/:id | Sửa tin nhắn |
| DELETE | /messages/:id | Xóa tin nhắn |
| POST | /messages/:id/reactions | Thêm reaction |
| DELETE | /messages/:id/reactions | Xóa reaction |
| POST | /messages/:id/forward | Forward |
| GET | /messages/search | Tìm kiếm |

### Upload
| Method | Endpoint | Max Size |
|--------|----------|----------|
| POST | /upload/image | 5MB |
| POST | /upload/file | 25MB |
| POST | /upload/video | 100MB |

---

## 7. Xử lý lỗi thường gặp

### ❌ Lỗi: Port 3000 đang bị dùng

```
npx kill-port 3000
npm run start:dev
```

### ❌ Lỗi: Database lỗi

Xóa file database và restart:
```
# Dừng server (Ctrl+C)
del chat_app.db
npm run start:dev
```

### ❌ Lỗi: "Username already exists"

Đổi username khác hoặc reset database.

### ❌ Lỗi: "User is not a participant"

User phải là thành viên của conversation mới gửi được tin nhắn.

### ❌ WebSocket không kết nối

1. Kiểm tra server đang chạy
2. Kiểm tra User ID đúng
3. Mở F12 → Console để xem lỗi

---

## 📋 Checklist Demo

- [ ] Server chạy thành công
- [ ] Mở được Swagger UI
- [ ] Tạo được 2 users
- [ ] Tạo được conversation
- [ ] Gửi được tin nhắn text
- [ ] Upload được ảnh/file
- [ ] Test được WebSocket real-time
- [ ] Typing indicator hoạt động
- [ ] Đánh dấu đã đọc hoạt động

---

**🎉 Chúc bạn demo thành công!**
