import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { ConversationParticipant, ParticipantRole } from './entities/conversation-participant.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UsersService } from '../users/users.service';

/**
 * Conversations Service
 * Handles conversation management operations
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepository: Repository<ConversationParticipant>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new conversation
   */
  async create(
    creatorId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const { type, name, participantIds } = createConversationDto;

    // Validate participants
    if (type === ConversationType.PRIVATE && participantIds.length !== 1) {
      throw new BadRequestException(
        'Private conversation must have exactly one other participant',
      );
    }

    // Add creator to participants
    const allParticipantIds = [...new Set([creatorId, ...participantIds])];

    // Check if private conversation already exists
    if (type === ConversationType.PRIVATE) {
      const existingConversation = await this.findPrivateConversation(
        creatorId,
        participantIds[0],
      );

      if (existingConversation) {
        return existingConversation;
      }
    }

    // Validate all users exist
    for (const userId of allParticipantIds) {
      await this.usersService.findById(userId);
    }

    // Create conversation
    const conversation = this.conversationRepository.create({
      type,
      name: type === ConversationType.GROUP ? name : null,
    });

    const savedConversation = await this.conversationRepository.save(conversation);

    // Add participants - creator is ADMIN, others are MEMBER
    const participants = allParticipantIds.map((userId) =>
      this.participantRepository.create({
        conversationId: savedConversation.id,
        userId,
        role: userId === creatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
      }),
    );

    await this.participantRepository.save(participants);

    this.logger.log(
      `Conversation created: ${savedConversation.id} (${type}) with ${allParticipantIds.length} participants`,
    );

    return this.findById(savedConversation.id);
  }

  /**
   * Find conversation by ID
   */
  async findById(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Find private conversation between two users
   */
  async findPrivateConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    const result = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'p1', 'p1.userId = :userId1', { userId1 })
      .innerJoin('conversation.participants', 'p2', 'p2.userId = :userId2', { userId2 })
      .where('conversation.type = :type', { type: ConversationType.PRIVATE })
      .getOne();

    return result;
  }

  /**
   * Get all conversations for a user
   */
  async findByUserId(userId: string): Promise<Conversation[]> {
    const participations = await this.participantRepository.find({
      where: { userId },
    });

    const conversationIds = participations.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    return this.conversationRepository.find({
      where: { id: In(conversationIds) },
      relations: ['participants'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Get participants of a conversation
   */
  async getParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return this.participantRepository.find({
      where: { conversationId },
    });
  }

  /**
   * Get participant user IDs
   */
  async getParticipantUserIds(conversationId: string): Promise<string[]> {
    const participants = await this.getParticipants(conversationId);
    return participants.map((p) => p.userId);
  }

  /**
   * Check if user is participant of conversation
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    return !!participant;
  }

  /**
   * Update last read time for a user in a conversation
   */
  async updateLastRead(conversationId: string, userId: string): Promise<void> {
    await this.participantRepository.update(
      { conversationId, userId },
      { lastReadAt: new Date() },
    );
  }

  /**
   * Add a participant to a group conversation
   */
  async addParticipant(
    conversationId: string,
    requesterId: string,
    newParticipantId: string,
  ): Promise<Conversation> {
    const conversation = await this.findById(conversationId);

    // Only group conversations can have participants added
    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot add participants to private conversations');
    }

    // Verify requester is a participant
    if (!(await this.isParticipant(conversationId, requesterId))) {
      throw new BadRequestException('You are not a participant of this conversation');
    }

    // Check if user is already a participant
    if (await this.isParticipant(conversationId, newParticipantId)) {
      throw new BadRequestException('User is already a participant');
    }

    // Validate user exists
    await this.usersService.findById(newParticipantId);

    // Add participant
    const participant = this.participantRepository.create({
      conversationId,
      userId: newParticipantId,
    });

    await this.participantRepository.save(participant);
    this.logger.log(`User ${newParticipantId} added to conversation ${conversationId}`);

    return this.findById(conversationId);
  }

  /**
   * Remove a participant from a group conversation
   */
  async removeParticipant(
    conversationId: string,
    requesterId: string,
    participantIdToRemove: string,
  ): Promise<Conversation> {
    const conversation = await this.findById(conversationId);

    // Only group conversations can have participants removed
    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot remove participants from private conversations');
    }

    // Verify requester is a participant
    if (!(await this.isParticipant(conversationId, requesterId))) {
      throw new BadRequestException('You are not a participant of this conversation');
    }

    // Check if target is a participant
    if (!(await this.isParticipant(conversationId, participantIdToRemove))) {
      throw new BadRequestException('User is not a participant of this conversation');
    }

    // Remove participant
    await this.participantRepository.delete({
      conversationId,
      userId: participantIdToRemove,
    });

    this.logger.log(`User ${participantIdToRemove} removed from conversation ${conversationId}`);

    return this.findById(conversationId);
  }

  // ==================== Update Conversation ====================

  /**
   * Update group conversation details (name, avatar, description)
   */
  async updateConversation(
    conversationId: string,
    requesterId: string,
    updateData: { name?: string; avatar?: string; description?: string },
  ): Promise<Conversation> {
    const conversation = await this.findById(conversationId);

    // Only group conversations can be updated
    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Cannot update private conversations');
    }

    // Verify requester is an admin
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId: requesterId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    if (participant.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('Only admins can update conversation details');
    }

    // Update fields
    if (updateData.name !== undefined) conversation.name = updateData.name;
    if (updateData.avatar !== undefined) conversation.avatar = updateData.avatar;
    if (updateData.description !== undefined) conversation.description = updateData.description;

    await this.conversationRepository.save(conversation);
    this.logger.log(`Conversation ${conversationId} updated by ${requesterId}`);

    return this.findById(conversationId);
  }

  // ==================== Role Management ====================

  /**
   * Check if user is admin of conversation
   */
  async isAdmin(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId },
    });

    return participant?.role === ParticipantRole.ADMIN;
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    conversationId: string,
    requesterId: string,
    targetUserId: string,
    newRole: ParticipantRole,
  ): Promise<ConversationParticipant> {
    const conversation = await this.findById(conversationId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Private conversations do not have roles');
    }

    // Verify requester is an admin
    if (!(await this.isAdmin(conversationId, requesterId))) {
      throw new ForbiddenException('Only admins can change roles');
    }

    // Find target participant
    const targetParticipant = await this.participantRepository.findOne({
      where: { conversationId, userId: targetUserId },
    });

    if (!targetParticipant) {
      throw new NotFoundException('Target user is not a participant');
    }

    targetParticipant.role = newRole;
    await this.participantRepository.save(targetParticipant);

    this.logger.log(`Role updated: ${targetUserId} is now ${newRole} in ${conversationId}`);

    return targetParticipant;
  }

  /**
   * Get participant with role info
   */
  async getParticipantWithRole(
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipant | null> {
    return this.participantRepository.findOne({
      where: { conversationId, userId },
    });
  }

  /**
   * Update last message info for a conversation (for chat list preview)
   */
  async updateLastMessage(
    conversationId: string,
    messageId: string,
    content: string | null,
    senderId: string,
    type: string,
  ): Promise<void> {
    await this.conversationRepository.update(conversationId, {
      lastMessageId: messageId,
      lastMessageContent: content,
      lastMessageSenderId: senderId,
      lastMessageType: type,
      lastMessageAt: new Date(),
    });
  }
}
