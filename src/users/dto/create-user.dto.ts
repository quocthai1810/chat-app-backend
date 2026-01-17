import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Create User DTO
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Unique username for the user',
    example: 'john.doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    description: 'Display name shown in chat',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    description: 'URL of user avatar image',
    example: '/uploads/avatar-123.png',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
