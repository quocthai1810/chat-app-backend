import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../enums/message-type.enum';
import { MessageStatus } from '../entities/message.entity';

/**
 * Sender Info DTO
 */
export class SenderInfoDto {
  @ApiProperty({ example: 'user-uuid-12345' })
  id: string;

  @ApiProperty({ example: 'john.doe' })
  username: string;

  @ApiProperty({ example: 'John Doe' })
  displayName: string;

  @ApiPropertyOptional({ example: '/uploads/avatar.png' })
  avatar: string | null;
}

/**
 * Message Response DTO
 * Data transfer object for message responses
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the message',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Conversation ID this message belongs to',
    example: 'conversation-uuid-12345',
  })
  conversationId: string;

  @ApiProperty({
    description: 'The unique identifier of the message sender',
    example: 'user-uuid-12345',
  })
  senderId: string;

  @ApiPropertyOptional({
    description: 'Sender information',
    type: SenderInfoDto,
  })
  sender?: SenderInfoDto;

  @ApiProperty({
    description: 'The text content of the message',
    example: 'Hello, how are you?',
    nullable: true,
  })
  content: string | null;

  @ApiProperty({
    description: 'The type of message',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  type: MessageType;

  @ApiProperty({
    description: 'The URL of the uploaded file',
    example: '/uploads/image-123456.png',
    nullable: true,
  })
  fileUrl: string | null;

  @ApiPropertyOptional({
    description: 'Original file name',
    example: 'document.pdf',
    nullable: true,
  })
  fileName?: string | null;

  @ApiPropertyOptional({
    description: 'File MIME type',
    example: 'application/pdf',
    nullable: true,
  })
  fileMimeType?: string | null;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 102400,
    nullable: true,
  })
  fileSize?: number | null;

  @ApiProperty({
    description: 'Message status',
    enum: MessageStatus,
    example: MessageStatus.SENT,
  })
  status: MessageStatus;

  @ApiPropertyOptional({
    description: 'Reply to message ID',
    example: 'message-uuid-12345',
    nullable: true,
  })
  replyToMessageId?: string | null;

  @ApiPropertyOptional({
    description: 'Forwarded from message ID (if forwarded)',
    example: 'original-message-uuid',
    nullable: true,
  })
  forwardedFromId?: string | null;

  @ApiPropertyOptional({
    description: 'When message was last edited',
    example: '2026-01-17T11:00:00.000Z',
    nullable: true,
  })
  editedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Reactions summary',
    example: [{ reaction: '👍', count: 3, users: ['user1', 'user2', 'user3'] }],
  })
  reactions?: { reaction: string; count: number; users: string[] }[];

  @ApiProperty({
    description: 'The timestamp when the message was created',
    example: '2026-01-17T10:30:00.000Z',
  })
  createdAt: Date;
}
