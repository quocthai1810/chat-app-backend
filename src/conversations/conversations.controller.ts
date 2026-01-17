import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { UsersService } from '../users/users.service';
import { ChatGateway } from '../messages/chat.gateway';
import { CreateConversationDto, ConversationResponseDto } from './dto';
import { ConversationType } from './entities/conversation.entity';
import { ParticipantRole } from './entities/conversation-participant.entity';

/**
 * Conversations Controller
 * REST API endpoints for conversation management
 */
@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly usersService: UsersService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Create a new conversation
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new conversation',
    description: 'Create a private (1-1) or group conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user creating the conversation',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  async create(
    @Query('userId') userId: string,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.create(
      userId,
      createConversationDto,
    );

    return this.toResponseDto(conversation, userId);
  }

  /**
   * Get all conversations for a user
   */
  @Get()
  @ApiOperation({
    summary: 'Get user conversations',
    description: 'Retrieve all conversations for a specific user',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user to get conversations for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of conversations',
    type: [ConversationResponseDto],
  })
  async findAll(
    @Query('userId') userId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.conversationsService.findByUserId(userId);

    return Promise.all(
      conversations.map((conv) => this.toResponseDto(conv, userId)),
    );
  }

  /**
   * Get conversation by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Retrieve a specific conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation details',
    type: ConversationResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.findById(id);
    return this.toResponseDto(conversation, userId);
  }

  /**
   * Start or get private conversation with another user
   */
  @Post('private/:targetUserId')
  @ApiOperation({
    summary: 'Start private conversation',
    description: 'Start a 1-1 conversation with another user (or get existing one)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user starting the conversation',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Private conversation',
    type: ConversationResponseDto,
  })
  async startPrivateConversation(
    @Query('userId') userId: string,
    @Param('targetUserId') targetUserId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.create(userId, {
      type: ConversationType.PRIVATE,
      participantIds: [targetUserId],
    });

    return this.toResponseDto(conversation, userId);
  }

  /**
   * Convert conversation entity to response DTO
   */
  private async toResponseDto(
    conversation: any,
    currentUserId: string,
  ): Promise<ConversationResponseDto> {
    const participantUsers = await Promise.all(
      conversation.participants.map(async (p: any) => {
        const user = await this.usersService.findById(p.userId);
        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          status: user.status,
          role: p.role, // Include role
          lastSeenAt: user.lastSeenAt,
        };
      }),
    );

    // For private chats, use the other user's info as conversation name/avatar
    let displayName = conversation.name;
    let displayAvatar = conversation.avatar;

    if (conversation.type === ConversationType.PRIVATE) {
      const otherUser = participantUsers.find((u) => u.id !== currentUserId);
      if (otherUser) {
        displayName = otherUser.displayName;
        displayAvatar = otherUser.avatar;
      }
    }

    return {
      id: conversation.id,
      type: conversation.type,
      category: conversation.category,
      name: displayName,
      avatar: displayAvatar,
      description: conversation.description,
      participants: participantUsers,
      lastMessage: conversation.lastMessageId
        ? {
            id: conversation.lastMessageId,
            content: conversation.lastMessageContent,
            type: conversation.lastMessageType,
            senderId: conversation.lastMessageSenderId,
            createdAt: conversation.lastMessageAt,
          }
        : undefined,
      unreadCount: 0, // TODO: Calculate unread count
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Add a participant to a group conversation
   */
  @Post(':id/participants')
  @ApiOperation({
    summary: 'Add participant to group',
    description: 'Add a user to a group conversation (only for GROUP type)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be a current participant)',
  })
  @ApiBody({
    description: 'User to add',
    schema: {
      type: 'object',
      required: ['participantId'],
      properties: {
        participantId: {
          type: 'string',
          example: 'user-uuid-to-add',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Participant added successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot add participants to private conversations',
  })
  async addParticipant(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() body: { participantId: string },
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.addParticipant(
      id,
      userId,
      body.participantId,
    );

    // Notify conversation about new member
    const newUser = await this.usersService.findById(body.participantId);
    this.chatGateway.server.to(`conversation:${id}`).emit('participantJoined', {
      conversationId: id,
      userId: body.participantId,
      username: newUser.username,
      displayName: newUser.displayName,
      avatar: newUser.avatar,
      addedBy: userId,
    });

    return this.toResponseDto(conversation, userId);
  }

  /**
   * Remove a participant from a group conversation
   */
  @Delete(':id/participants/:participantId')
  @ApiOperation({
    summary: 'Remove participant from group',
    description: 'Remove a user from a group conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be a current participant)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Participant removed successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove participants from private conversations',
  })
  async removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Query('userId') userId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.removeParticipant(
      id,
      userId,
      participantId,
    );

    // Notify conversation about member removal
    const removedUser = await this.usersService.findById(participantId);
    this.chatGateway.server.to(`conversation:${id}`).emit('participantLeft', {
      conversationId: id,
      userId: participantId,
      username: removedUser.username,
      displayName: removedUser.displayName,
      removedBy: userId,
    });

    return this.toResponseDto(conversation, userId);
  }

  /**
   * Leave a conversation
   */
  @Delete(':id/leave')
  @ApiOperation({
    summary: 'Leave conversation',
    description: 'Leave a group conversation',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the user leaving the conversation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Left conversation successfully',
  })
  async leaveConversation(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findById(userId);
    await this.conversationsService.removeParticipant(id, userId, userId);

    // Notify conversation about member leaving
    this.chatGateway.server.to(`conversation:${id}`).emit('participantLeft', {
      conversationId: id,
      userId,
      username: user.username,
      displayName: user.displayName,
      selfLeft: true,
    });

    return { success: true, message: 'Left conversation successfully' };
  }

  // ==================== Update Conversation ====================

  /**
   * Update group conversation (name, avatar, description)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update group conversation',
    description: 'Update group name, avatar, or description (admin only)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be admin)',
  })
  @ApiBody({
    description: 'Update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'New Group Name',
        },
        avatar: {
          type: 'string',
          example: 'https://example.com/avatar.jpg',
        },
        description: {
          type: 'string',
          example: 'Updated group description',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation updated successfully',
    type: ConversationResponseDto,
  })
  async updateConversation(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() body: { name?: string; avatar?: string; description?: string },
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.updateConversation(
      id,
      userId,
      body,
    );

    // Notify all participants about update
    this.chatGateway.server.to(`conversation:${id}`).emit('conversationUpdated', {
      conversationId: id,
      name: conversation.name,
      avatar: conversation.avatar,
      description: conversation.description,
      updatedBy: userId,
    });

    return this.toResponseDto(conversation, userId);
  }

  // ==================== Role Management ====================

  /**
   * Update participant role (make admin or remove admin)
   */
  @Put(':id/participants/:participantId/role')
  @ApiOperation({
    summary: 'Update participant role',
    description: 'Change a participant role to ADMIN or MEMBER (admin only)',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID of the requesting user (must be admin)',
  })
  @ApiBody({
    description: 'New role',
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: {
          type: 'string',
          enum: ['ADMIN', 'MEMBER'],
          example: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
  })
  async updateParticipantRole(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @Query('userId') userId: string,
    @Body() body: { role: ParticipantRole },
  ): Promise<{ success: boolean; participant: any }> {
    const participant = await this.conversationsService.updateParticipantRole(
      id,
      userId,
      participantId,
      body.role,
    );

    // Notify about role change
    this.chatGateway.server.to(`conversation:${id}`).emit('participantRoleChanged', {
      conversationId: id,
      userId: participantId,
      newRole: body.role,
      changedBy: userId,
    });

    return { success: true, participant };
  }
}
