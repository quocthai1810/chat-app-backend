import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists
  const uploadsPath = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
    logger.log(`Created uploads directory at: ${uploadsPath}`);
  }

  // Enable CORS for frontend applications
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve static files from uploads directory
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Swagger API documentation configuration
  const config = new DocumentBuilder()
    .setTitle('Chat Application API')
    .setDescription(
      `
## Chat Application Backend API

This API provides endpoints for a real-time chat application with the following features:

### Features
- **Real-time messaging** via WebSocket (Socket.io)
- **Message persistence** with SQLite/PostgreSQL
- **File uploads** for image sharing
- **Chat history** retrieval

### WebSocket Events
Connect to the WebSocket at the deployed URL + \`/chat\`

#### Client → Server Events:
- \`sendMessage\` - Send a new message
- \`typing\` - Notify typing status
- \`getChatHistory\` - Request chat history

#### Server → Client Events:
- \`newMessage\` - Receive new messages
- \`userConnected\` - User connection notification
- \`userDisconnected\` - User disconnection notification
- \`userTyping\` - Typing indicator
- \`chatHistory\` - Chat history response
- \`messageError\` - Error notification
      `,
    )
    .setVersion('1.0.0')
    .addTag('Messages', 'Chat message operations')
    .addTag('Upload', 'File upload operations')
    .setContact(
      'API Support',
      'https://github.com/quocthai1810/chat-app-backend',
      'support@example.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  // Enable Swagger for all environments (demo purposes)
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Chat App API Documentation',
  });

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api`);
  logger.log(`🔌 WebSocket endpoint: ws://localhost:${port}/chat`);
}

bootstrap();
