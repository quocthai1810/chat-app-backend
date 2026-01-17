import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

/**
 * User Response DTO
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'uuid-12345',
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'john.doe',
  })
  username: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
  })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: '/uploads/avatar-123.png',
  })
  avatar: string | null;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    example: UserStatus.ONLINE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Last seen timestamp',
  })
  lastSeenAt: Date | null;
}
