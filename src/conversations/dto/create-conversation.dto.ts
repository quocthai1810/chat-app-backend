import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

/**
 * Create Conversation DTO
 */
export class CreateConversationDto {
  @ApiProperty({
    description: 'Type of conversation',
    enum: ConversationType,
    example: ConversationType.PRIVATE,
  })
  @IsEnum(ConversationType)
  @IsNotEmpty()
  type: ConversationType;

  @ApiPropertyOptional({
    description: 'Name of the conversation (required for GROUP type)',
    example: 'Project Team',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Array of user IDs to add as participants',
    example: ['user-id-1', 'user-id-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}
