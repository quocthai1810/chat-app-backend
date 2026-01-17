import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { MessageType } from '../enums/message-type.enum';

/**
 * Create Message DTO
 * Data transfer object for creating a new message
 */
export class CreateMessageDto {
  @ApiProperty({
    description: 'The conversation ID this message belongs to',
    example: 'conversation-uuid-12345',
  })
  @IsNotEmpty({ message: 'Conversation ID is required' })
  @IsString()
  conversationId: string;

  @ApiProperty({
    description: 'The unique identifier of the message sender',
    example: 'user-uuid-12345',
  })
  @IsNotEmpty({ message: 'Sender ID is required' })
  @IsString()
  senderId: string;

  @ApiPropertyOptional({
    description: 'The text content of the message. Required for TEXT type messages.',
    example: 'Hello, how are you?',
  })
  @ValidateIf((o) => o.type === MessageType.TEXT)
  @IsNotEmpty({ message: 'Content is required for text messages' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'The type of message',
    enum: MessageType,
    example: MessageType.TEXT,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType, { message: 'Type must be TEXT, IMAGE, FILE, VIDEO, AUDIO, or SYSTEM' })
  @IsNotEmpty()
  type: MessageType;

  @ApiPropertyOptional({
    description: 'The URL of the uploaded file. Required for IMAGE/FILE type messages.',
    example: '/uploads/image-123456.png',
  })
  @ValidateIf((o) => [MessageType.IMAGE, MessageType.FILE, MessageType.VIDEO, MessageType.AUDIO].includes(o.type))
  @IsNotEmpty({ message: 'File URL is required for file messages' })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({
    description: 'Original file name',
    example: 'document.pdf',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  fileMimeType?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 102400,
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Reply to message ID',
    example: 'message-uuid-12345',
  })
  @IsOptional()
  @IsString()
  replyToMessageId?: string;
}
