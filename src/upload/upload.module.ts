import { Module, forwardRef } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';

/**
 * Upload Module
 * Handles file upload functionality
 */
@Module({
  imports: [
    MessagesModule,
    forwardRef(() => ConversationsModule),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
