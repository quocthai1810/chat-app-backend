import { ApiProperty } from '@nestjs/swagger';

/**
 * Upload Response DTO
 * Response object for file upload operations
 */
export class UploadResponseDto {
  @ApiProperty({
    description: 'The URL path to access the uploaded file',
    example: '/uploads/image-1705500000000-123456789.png',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'The original name of the uploaded file',
    example: 'my-image.png',
  })
  originalName: string;

  @ApiProperty({
    description: 'The MIME type of the uploaded file',
    example: 'image/png',
  })
  mimeType: string;

  @ApiProperty({
    description: 'The size of the uploaded file in bytes',
    example: 102400,
  })
  size: number;
}
