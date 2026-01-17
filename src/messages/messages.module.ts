import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';

/**
 * Messages Module
 * Handles all message-related functionality including REST API and WebSocket
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageReaction, MessageDeletion]),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ChatGateway],
  exports: [MessagesService, ChatGateway],
})
export class MessagesModule {}
