import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';

/**
 * Conversations Module
 * Handles conversation management functionality
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationParticipant]),
    UsersModule,
    forwardRef(() => MessagesModule), // For ChatGateway
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
