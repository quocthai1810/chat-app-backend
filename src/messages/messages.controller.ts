import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageType } from './enums/message-type.enum';
import { ChatGateway } from './chat.gateway';
import { MessageStatus } from './entities/message.entity';
import { ConversationsService } from '../conversations/conversations.service';

/**
 * Messages Controller
 * REST API endpoints for message operations
 */
@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatGateway: ChatGateway,
    private readonly conversationsService: ConversationsService,
  ) {}

  // ==================== Helper Methods ====================

  private toMessageResponse(message: any): MessageResponseDto {
    return {
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
      replyToMessageId: message.replyToMessageId,
      forwardedFromId: message.forwardedFromId,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
    };
  }

  /**
   * Get messages by conversation ID
   */
  @Get('conversation/:conversationId')
  @ApiOperation({
    summary: 'Get messages in a conversation',
    description: 'Retrieves all messages from a specific conversation with pagination',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be a participant)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to retrieve (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of messages to skip for pagination (default: 0)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved messages',
    type: [MessageResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a participant of this conversation',
  })
  async findByConversation(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.findByConversationId(
      conversationId,
      userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );

    return messages.map((message) => ({
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
      replyToMessageId: message.replyToMessageId,
      createdAt: message.createdAt,
    }));
  }

  /**
   * Search messages in a conversation
   */
  @Get('conversation/:conversationId/search')
  @ApiOperation({
    summary: 'Search messages',
    description: 'Search for messages containing specific text in a conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be a participant)',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query text',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results',
    type: [MessageResponseDto],
  })
  async searchMessages(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.searchMessages(
      conversationId,
      userId,
      query,
      limit ? Number(limit) : 20,
    );

    return messages.map((message) => ({
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
      replyToMessageId: message.replyToMessageId,
      createdAt: message.createdAt,
    }));
  }

  /**
   * Search messages globally across all user's conversations
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search messages globally',
    description: 'Search for messages across all conversations the user is a participant of',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query text',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results',
    type: [MessageResponseDto],
  })
  async searchMessagesGlobal(
    @Query('userId') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.searchMessagesGlobal(
      userId,
      query,
      limit ? Number(limit) : 50,
    );

    return messages.map((message) => ({
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
      replyToMessageId: message.replyToMessageId,
      createdAt: message.createdAt,
    }));
  }

  /**
   * Send a text message to a conversation
   */
  @Post('conversation/:conversationId/text')
  @ApiOperation({
    summary: 'Send a text message',
    description: 'Send a text message to a specific conversation',
  })
  @ApiBody({
    description: 'Text message data',
    schema: {
      type: 'object',
      required: ['content', 'senderId'],
      properties: {
        content: {
          type: 'string',
          example: 'Hello, how are you?',
        },
        senderId: {
          type: 'string',
          example: 'user-uuid-12345',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Text message sent successfully',
    type: MessageResponseDto,
  })
  async sendTextMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string; senderId: string },
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.saveMessage({
      conversationId,
      senderId: body.senderId,
      content: body.content,
      type: MessageType.TEXT,
    });

    const messageResponse: MessageResponseDto = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      status: message.status,
      createdAt: message.createdAt,
    };

    // Get participants to notify chat list
    const conversation = await this.conversationsService.findById(conversationId);
    const participantIds = conversation?.participants?.map(p => p.userId) || [];

    // Broadcast to conversation participants via WebSocket
    this.chatGateway.broadcastToConversation(conversationId, messageResponse, participantIds);

    return messageResponse;
  }

  /**
   * Delete a message
   */
  @Delete(':messageId')
  @ApiOperation({
    summary: 'Delete a message',
    description: 'Delete a specific message (only sender can delete)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be the sender)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not the sender of this message',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Message not found',
  })
  async deleteMessageForEveryone(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const msg = await this.messagesService.findById(messageId);
    await this.messagesService.deleteMessageForEveryone(messageId, userId);

    // Broadcast deletion to conversation participants
    this.chatGateway.server.to(`conversation:${msg.conversationId}`).emit('messageDeleted', { 
      messageId, 
      deletedForEveryone: true 
    });

    return { success: true, message: 'Message deleted for everyone' };
  }

  /**
   * Delete message for me only
   */
  @Delete(':messageId/for-me')
  @ApiOperation({
    summary: 'Delete message for me only',
    description: 'Hide a message from your view only (others can still see it)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message hidden from your view',
  })
  async deleteMessageForMe(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.messagesService.deleteMessageForMe(messageId, userId);
    return { success: true, message: 'Message deleted for you' };
  }

  /**
   * Update message status (delivered/read)
   */
  @Put(':messageId/status')
  @ApiOperation({
    summary: 'Update message status',
    description: 'Update message status to DELIVERED or READ',
  })
  @ApiBody({
    description: 'Status update data',
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['DELIVERED', 'READ'],
          example: 'READ',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message status updated',
    type: MessageResponseDto,
  })
  async updateMessageStatus(
    @Param('messageId') messageId: string,
    @Body() body: { status: MessageStatus },
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.updateStatus(messageId, body.status);
    const messageResponse = this.toMessageResponse(message);

    // Broadcast status update
    this.chatGateway.server.to(`conversation:${message.conversationId}`).emit('messageStatusUpdated', messageResponse);

    return messageResponse;
  }

  // ==================== Edit Message ====================

  /**
   * Edit a text message
   */
  @Put(':messageId')
  @ApiOperation({
    summary: 'Edit a message',
    description: 'Edit the content of a text message (only sender can edit)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be the sender)',
  })
  @ApiBody({
    description: 'New message content',
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          type: 'string',
          example: 'Updated message content',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message edited successfully',
    type: MessageResponseDto,
  })
  async editMessage(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
    @Body() body: { content: string },
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.editMessage(messageId, userId, body.content);
    const messageResponse = this.toMessageResponse(message);

    // Broadcast edit to conversation participants
    this.chatGateway.server.to(`conversation:${message.conversationId}`).emit('messageEdited', messageResponse);

    return messageResponse;
  }

  // ==================== Forward Message ====================

  /**
   * Forward a message to another conversation
   */
  @Post(':messageId/forward')
  @ApiOperation({
    summary: 'Forward a message',
    description: 'Forward a message to another conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user forwarding the message',
  })
  @ApiBody({
    description: 'Target conversation',
    schema: {
      type: 'object',
      required: ['targetConversationId'],
      properties: {
        targetConversationId: {
          type: 'string',
          example: 'conversation-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message forwarded successfully',
    type: MessageResponseDto,
  })
  async forwardMessage(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
    @Body() body: { targetConversationId: string },
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.forwardMessage(
      messageId,
      userId,
      body.targetConversationId,
    );
    const messageResponse = this.toMessageResponse(message);

    // Get participants to notify chat list
    const conversation = await this.conversationsService.findById(body.targetConversationId);
    const participantIds = conversation?.participants?.map(p => p.userId) || [];

    // Broadcast to target conversation
    this.chatGateway.broadcastToConversation(body.targetConversationId, messageResponse, participantIds);

    return messageResponse;
  }

  // ==================== Reactions ====================

  /**
   * Add or update reaction to a message
   */
  @Post(':messageId/reactions')
  @ApiOperation({
    summary: 'React to a message',
    description: 'Add or update your reaction to a message (👍 ❤️ 😆 😮 😢 😠)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user reacting',
  })
  @ApiBody({
    description: 'Reaction emoji',
    schema: {
      type: 'object',
      required: ['reaction'],
      properties: {
        reaction: {
          type: 'string',
          example: '👍',
          description: 'Emoji character',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reaction added',
  })
  async addReaction(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
    @Body() body: { reaction: string },
  ): Promise<{ success: boolean; reaction: any }> {
    const reaction = await this.messagesService.addReaction(messageId, userId, body.reaction);
    const message = await this.messagesService.findById(messageId);

    // Broadcast reaction to conversation participants
    this.chatGateway.server.to(`conversation:${message.conversationId}`).emit('messageReaction', {
      messageId,
      userId,
      reaction: body.reaction,
      action: 'add',
    });

    return { success: true, reaction };
  }

  /**
   * Remove reaction from a message
   */
  @Delete(':messageId/reactions')
  @ApiOperation({
    summary: 'Remove reaction',
    description: 'Remove your reaction from a message',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user removing reaction',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reaction removed',
  })
  async removeReaction(
    @Param('messageId') messageId: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean }> {
    const message = await this.messagesService.findById(messageId);
    await this.messagesService.removeReaction(messageId, userId);

    // Broadcast reaction removal to conversation participants
    this.chatGateway.server.to(`conversation:${message.conversationId}`).emit('messageReaction', {
      messageId,
      userId,
      action: 'remove',
    });

    return { success: true };
  }

  /**
   * Get reactions for a message
   */
  @Get(':messageId/reactions')
  @ApiOperation({
    summary: 'Get message reactions',
    description: 'Get all reactions for a specific message with summary',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reactions retrieved',
  })
  async getReactions(
    @Param('messageId') messageId: string,
  ): Promise<{ reactions: any[]; summary: any[] }> {
    const reactions = await this.messagesService.getReactions(messageId);
    const summary = await this.messagesService.getReactionsSummary(messageId);
    return { reactions, summary };
  }

  // ==================== MEDIA GALLERY / KHO LƯU TRỮ ====================

  /**
   * Get all images in a conversation (Kho hình ảnh)
   */
  @Get('conversation/:conversationId/gallery/images')
  @ApiOperation({
    summary: 'Get conversation images',
    description: 'Get all images shared in a conversation (Kho hình ảnh)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Images retrieved successfully',
  })
  async getConversationImages(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: MessageResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.messagesService.getConversationImages(
      conversationId,
      page || 1,
      limit || 20,
    );
    return {
      ...result,
      items: result.items.map((m) => this.toMessageResponse(m)),
    };
  }

  /**
   * Get all videos in a conversation (Kho video)
   */
  @Get('conversation/:conversationId/gallery/videos')
  @ApiOperation({
    summary: 'Get conversation videos',
    description: 'Get all videos shared in a conversation (Kho video)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Videos retrieved successfully',
  })
  async getConversationVideos(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: MessageResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.messagesService.getConversationVideos(
      conversationId,
      page || 1,
      limit || 20,
    );
    return {
      ...result,
      items: result.items.map((m) => this.toMessageResponse(m)),
    };
  }

  /**
   * Get all files/documents in a conversation (Kho tài liệu)
   */
  @Get('conversation/:conversationId/gallery/files')
  @ApiOperation({
    summary: 'Get conversation files',
    description: 'Get all files/documents shared in a conversation (Kho tài liệu)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
  })
  async getConversationFiles(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: MessageResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.messagesService.getConversationFiles(
      conversationId,
      page || 1,
      limit || 20,
    );
    return {
      ...result,
      items: result.items.map((m) => this.toMessageResponse(m)),
    };
  }

  /**
   * Get all links shared in a conversation (Kho link)
   */
  @Get('conversation/:conversationId/gallery/links')
  @ApiOperation({
    summary: 'Get conversation links',
    description: 'Get all links shared in a conversation (Kho link)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Links retrieved successfully',
  })
  async getConversationLinks(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: { message: MessageResponseDto; links: string[] }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.messagesService.getConversationLinks(
      conversationId,
      page || 1,
      limit || 20,
    );
    return {
      ...result,
      items: result.items.map((item) => ({
        message: this.toMessageResponse(item.message),
        links: item.links,
      })),
    };
  }

  /**
   * Get all media (images + videos) in a conversation
   */
  @Get('conversation/:conversationId/gallery/media')
  @ApiOperation({
    summary: 'Get conversation media',
    description: 'Get all images and videos shared in a conversation',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media retrieved successfully',
  })
  async getConversationMedia(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    items: MessageResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.messagesService.getConversationMedia(
      conversationId,
      page || 1,
      limit || 20,
    );
    return {
      ...result,
      items: result.items.map((m) => this.toMessageResponse(m)),
    };
  }

  /**
   * Get storage summary for a conversation (Tổng quan kho lưu trữ)
   */
  @Get('conversation/:conversationId/gallery/summary')
  @ApiOperation({
    summary: 'Get storage summary',
    description: 'Get a summary of all media, files, and links in a conversation (Tổng quan kho lưu trữ)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 10 },
            totalSize: { type: 'number', example: 5242880, description: 'Size in bytes' },
          },
        },
        videos: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 3 },
            totalSize: { type: 'number', example: 52428800 },
          },
        },
        files: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 5 },
            totalSize: { type: 'number', example: 10485760 },
          },
        },
        links: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 15 },
          },
        },
        total: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 18 },
            totalSize: { type: 'number', example: 68157440 },
          },
        },
      },
    },
  })
  async getConversationStorageSummary(
    @Param('conversationId') conversationId: string,
  ): Promise<{
    images: { count: number; totalSize: number };
    videos: { count: number; totalSize: number };
    files: { count: number; totalSize: number };
    links: { count: number };
    total: { count: number; totalSize: number };
  }> {
    return this.messagesService.getConversationStorageSummary(conversationId);
  }
}
