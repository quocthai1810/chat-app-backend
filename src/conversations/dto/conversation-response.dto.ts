import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType, ConversationCategory } from '../entities/conversation.entity';
import { UserResponseDto } from '../../users/dto';

/**
 * Conversation Response DTO
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation unique identifier',
    example: 'uuid-12345',
  })
  id: string;

  @ApiProperty({
    description: 'Type of conversation',
    enum: ConversationType,
    example: ConversationType.PRIVATE,
  })
  type: ConversationType;

  @ApiPropertyOptional({
    description: 'Category of conversation (for GROUP type)',
    enum: ConversationCategory,
    example: ConversationCategory.GENERAL,
  })
  category?: ConversationCategory;

  @ApiPropertyOptional({
    description: 'Conversation name (for GROUP type)',
    example: 'Project Team',
  })
  name: string | null;

  @ApiPropertyOptional({
    description: 'Conversation avatar (for GROUP type)',
    example: '/uploads/group-avatar.png',
  })
  avatar: string | null;

  @ApiPropertyOptional({
    description: 'Conversation description (for GROUP type)',
    example: 'Discussion group for Project ABC',
  })
  description?: string | null;

  @ApiProperty({
    description: 'List of participants in the conversation',
    type: [UserResponseDto],
  })
  participants: UserResponseDto[];

  @ApiPropertyOptional({
    description: 'Last message in the conversation',
  })
  lastMessage?: {
    id: string;
    content: string | null;
    type: string;
    senderId: string;
    createdAt: Date;
  };

  @ApiProperty({
    description: 'Number of unread messages',
    example: 5,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Conversation creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}
