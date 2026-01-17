import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MessagesModule } from './messages/messages.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { Message } from './messages/entities/message.entity';
import { MessageReaction } from './messages/entities/message-reaction.entity';
import { MessageDeletion } from './messages/entities/message-deletion.entity';
import { User } from './users/entities/user.entity';
import { Conversation } from './conversations/entities/conversation.entity';
import { ConversationParticipant } from './conversations/entities/conversation-participant.entity';
import { Department, Project, ProjectMember } from './organizations/entities';

/**
 * App Module
 * Root module of the application
 */
@Module({
  imports: [
    // TypeORM configuration - supports both SQLite (dev) and PostgreSQL (prod)
    TypeOrmModule.forRoot(
      process.env.DB_TYPE === 'postgres'
        ? {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'chat_app',
            entities: [
              User,
              Conversation,
              ConversationParticipant,
              Message,
              MessageReaction,
              MessageDeletion,
              Department,
              Project,
              ProjectMember,
            ],
            synchronize: true, // Auto-create tables
            logging: process.env.NODE_ENV !== 'production',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          }
        : {
            type: 'sqlite',
            database: process.env.DB_DATABASE || 'chat_app.db',
            entities: [
              User,
              Conversation,
              ConversationParticipant,
              Message,
              MessageReaction,
              MessageDeletion,
              Department,
              Project,
              ProjectMember,
            ],
            synchronize: true, // Auto-create tables
            logging: process.env.NODE_ENV !== 'production',
          },
    ),

    // Serve static files from the uploads directory
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: false,
      },
    }),

    // Feature modules
    OrganizationsModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    UploadModule,
  ],
})
export class AppModule {}
