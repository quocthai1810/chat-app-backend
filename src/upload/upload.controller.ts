import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadResponseDto } from './dto/upload-response.dto';
import { MessagesService } from '../messages/messages.service';
import { MessageType } from '../messages/enums/message-type.enum';
import { MessageResponseDto } from '../messages/dto/message-response.dto';
import { ChatGateway } from '../messages/chat.gateway';
import { ConversationsService } from '../conversations/conversations.service';

// Maximum file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB for images
const MAX_FILE_SIZE = 25 * 1024 * 1024;   // 25MB for documents
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Allowed MIME types for videos
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
];

// Allowed MIME types for documents
const ALLOWED_FILE_TYPES = [
  // PDF
  'application/pdf',
  // Microsoft Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

// Combined allowed types
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_FILE_TYPES];

/**
 * Upload Controller
 * Handles file upload operations
 */
@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatGateway: ChatGateway,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Upload an image
   */
  @Post('image')
  @ApiOperation({
    summary: 'Upload an image',
    description: 'Upload an image file. Supported: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      required: ['file', 'senderId', 'conversationId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload',
        },
        conversationId: {
          type: 'string',
          description: 'The conversation ID',
          example: 'conv-uuid-12345',
        },
        senderId: {
          type: 'string',
          description: 'The sender ID',
          example: 'user-uuid-12345',
        },
        content: {
          type: 'string',
          description: 'Optional caption',
          example: 'Check out this photo!',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image uploaded successfully',
    type: MessageResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `image-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Body('senderId') senderId: string,
    @Body('content') content?: string,
  ): Promise<MessageResponseDto> {
    return this.createFileMessage(file, conversationId, senderId, MessageType.IMAGE, content);
  }

  /**
   * Upload a document file (PDF, Word, Excel, etc.)
   */
  @Post('file')
  @ApiOperation({
    summary: 'Upload a document',
    description: 'Upload a document file. Supported: PDF, Word, Excel, PowerPoint, Text, CSV, ZIP. Max size: 25MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file to upload',
    schema: {
      type: 'object',
      required: ['file', 'senderId', 'conversationId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file to upload',
        },
        conversationId: {
          type: 'string',
          description: 'The conversation ID',
          example: 'conv-uuid-12345',
        },
        senderId: {
          type: 'string',
          description: 'The sender ID',
          example: 'user-uuid-12345',
        },
        content: {
          type: 'string',
          description: 'Optional description',
          example: 'Here is the report',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document uploaded successfully',
    type: MessageResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `file-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Invalid file type. Allowed: PDF, Word, Excel, PowerPoint, Text, CSV, ZIP`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Body('senderId') senderId: string,
    @Body('content') content?: string,
  ): Promise<MessageResponseDto> {
    return this.createFileMessage(file, conversationId, senderId, MessageType.FILE, content);
  }

  /**
   * Upload a video
   */
  @Post('video')
  @ApiOperation({
    summary: 'Upload a video',
    description: 'Upload a video file. Supported: MP4, MPEG, WebM, MOV, AVI, MKV. Max size: 100MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Video file to upload',
    schema: {
      type: 'object',
      required: ['file', 'senderId', 'conversationId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The video file to upload',
        },
        conversationId: {
          type: 'string',
          description: 'The conversation ID',
          example: 'conv-uuid-12345',
        },
        senderId: {
          type: 'string',
          description: 'The sender ID',
          example: 'user-uuid-12345',
        },
        content: {
          type: 'string',
          description: 'Optional caption',
          example: 'Check out this video!',
        },
        replyToMessageId: {
          type: 'string',
          description: 'Optional: Reply to message ID',
          example: 'message-uuid-12345',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Video uploaded successfully',
    type: MessageResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `video-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Invalid video type. Allowed: MP4, MPEG, WebM, MOV, AVI, MKV`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: MAX_VIDEO_SIZE },
    }),
  )
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_VIDEO_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Body('senderId') senderId: string,
    @Body('content') content?: string,
    @Body('replyToMessageId') replyToMessageId?: string,
  ): Promise<MessageResponseDto> {
    return this.createFileMessage(file, conversationId, senderId, MessageType.VIDEO, content, replyToMessageId);
  }

  /**
   * Helper method to create file message
   */
  private async createFileMessage(
    file: Express.Multer.File,
    conversationId: string,
    senderId: string,
    type: MessageType,
    content?: string,
    replyToMessageId?: string,
  ): Promise<MessageResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!conversationId) {
      throw new BadRequestException('Conversation ID is required');
    }
    if (!senderId) {
      throw new BadRequestException('Sender ID is required');
    }

    const fileUrl = `/uploads/${file.filename}`;

    const message = await this.messagesService.saveMessage({
      conversationId,
      senderId,
      type,
      fileUrl,
      content,
      fileName: file.originalname,
      fileMimeType: file.mimetype,
      fileSize: file.size,
      replyToMessageId,
    });

    const messageResponse: MessageResponseDto = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileMimeType: message.fileMimeType,
      fileSize: message.fileSize,
      status: message.status,
      createdAt: message.createdAt,
    };

    // Get participants to notify chat list
    const conversation = await this.conversationsService.findById(conversationId);
    const participantIds = conversation?.participants?.map(p => p.userId) || [];

    this.chatGateway.broadcastToConversation(conversationId, messageResponse, participantIds);

    return messageResponse;
  }
}
