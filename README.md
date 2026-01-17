# Chat Application Backend

A production-ready NestJS backend for a real-time chat application with WebSocket support, file uploads, and SQLite database.

## Features

- 🚀 **Real-time messaging** via WebSocket (Socket.io)
- 💾 **Message persistence** with TypeORM and SQLite (PostgreSQL ready)
- 📁 **File uploads** for image sharing with Multer
- 📖 **API documentation** with Swagger/OpenAPI
- ✅ **Input validation** with class-validator
- 🔒 **Production-ready** error handling

## Tech Stack

- **Framework:** NestJS 10
- **Database:** TypeORM with SQLite (configurable for PostgreSQL)
- **Real-time:** Socket.io via NestJS WebSocket Gateway
- **Documentation:** Swagger (OpenAPI)
- **File Handling:** Multer

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── messages/                        # Messages feature module
│   ├── dto/
│   │   ├── create-message.dto.ts    # Message creation DTO
│   │   ├── message-response.dto.ts  # Message response DTO
│   │   └── index.ts
│   ├── entities/
│   │   └── message.entity.ts        # Message database entity
│   ├── enums/
│   │   └── message-type.enum.ts     # Message type enum
│   ├── chat.gateway.ts              # WebSocket gateway
│   ├── messages.controller.ts       # REST API controller
│   ├── messages.module.ts           # Feature module
│   └── messages.service.ts          # Business logic service
└── upload/                          # Upload feature module
    ├── dto/
    │   └── upload-response.dto.ts   # Upload response DTO
    ├── upload.controller.ts         # Upload controller
    └── upload.module.ts             # Upload module
```

## Installation

```bash
# Install dependencies
npm install

# Create uploads directory
mkdir uploads
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, access Swagger UI at:
- **Local:** http://localhost:3000/api

## WebSocket Usage

### Connection

Connect to the WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  query: { userId: 'user-123' }
});
```

### Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `sendMessage` | `CreateMessageDto` | Send a new message |
| `typing` | `{ userId: string, isTyping: boolean }` | Typing indicator |
| `getChatHistory` | `{ limit?: number, offset?: number }` | Request chat history |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `newMessage` | `MessageResponseDto` | New message received |
| `userConnected` | `{ clientId, userId, connectedUsers }` | User connected |
| `userDisconnected` | `{ clientId, userId, connectedUsers }` | User disconnected |
| `userTyping` | `{ userId, isTyping }` | User typing status |
| `chatHistory` | `MessageResponseDto[]` | Chat history response |
| `messageError` | `{ error, details }` | Error notification |

### Example: Send a Text Message

```javascript
socket.emit('sendMessage', {
  content: 'Hello, World!',
  type: 'TEXT',
  senderId: 'user-123'
});
```

### Example: Send an Image Message

```javascript
// First, upload the image
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:3000/upload', {
  method: 'POST',
  body: formData
});

const { fileUrl } = await response.json();

// Then send the message with the file URL
socket.emit('sendMessage', {
  type: 'IMAGE',
  fileUrl: fileUrl,
  senderId: 'user-123'
});
```

## REST API Endpoints

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages` | Get chat history with pagination |
| GET | `/messages/count` | Get total message count |
| GET | `/messages/sender/:senderId` | Get messages by sender |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload an image file |

## Database Configuration

### SQLite (Default)

The application uses SQLite by default. The database file `chat_app.db` will be created in the project root.

### PostgreSQL

To switch to PostgreSQL, update the TypeORM configuration in `app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'chat_app',
  entities: [Message],
  synchronize: false, // Use migrations in production
  logging: process.env.NODE_ENV !== 'production',
})
```

Then install the PostgreSQL driver:

```bash
npm install pg
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `NODE_ENV` | `development` | Environment mode |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `password` | PostgreSQL password |
| `DB_NAME` | `chat_app` | PostgreSQL database name |

## License

MIT
