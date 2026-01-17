import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Like } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageType } from './enums/message-type.enum';
import { ConversationsService } from '../conversations/conversations.service';

/**
 * Messages Service
 * Handles all business logic for message operations
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepository: Repository<MessageReaction>,
    @InjectRepository(MessageDeletion)
    private readonly deletionRepository: Repository<MessageDeletion>,
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Save a new message to the database
   * @param createMessageDto - The message data to save
   * @returns The saved message entity
   */
  async saveMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    try {
      // Validate message content based on type
      this.validateMessageContent(createMessageDto);

      // Verify user is a participant of the conversation
      const isParticipant = await this.conversationsService.isParticipant(
        createMessageDto.conversationId,
        createMessageDto.senderId,
      );

      if (!isParticipant) {
        throw new ForbiddenException('User is not a participant of this conversation');
      }

      const message = this.messageRepository.create({
        conversationId: createMessageDto.conversationId,
        senderId: createMessageDto.senderId,
        content: createMessageDto.content ?? null,
        type: createMessageDto.type,
        fileUrl: createMessageDto.fileUrl ?? null,
        fileName: createMessageDto.fileName ?? null,
        fileMimeType: createMessageDto.fileMimeType ?? null,
        fileSize: createMessageDto.fileSize ?? null,
        replyToMessageId: createMessageDto.replyToMessageId ?? null,
        status: MessageStatus.SENT,
      });

      const savedMessage = await this.messageRepository.save(message);
      this.logger.log(`Message saved successfully with ID: ${savedMessage.id}`);

      // Update conversation's last message for chat list preview
      await this.conversationsService.updateLastMessage(
        savedMessage.conversationId,
        savedMessage.id,
        savedMessage.content,
        savedMessage.senderId,
        savedMessage.type,
      );

      return savedMessage;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to save message: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to save message');
    }
  }

  /**
   * Get messages by conversation ID
   */
  async findByConversationId(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    try {
      // Verify user is a participant
      const isParticipant = await this.conversationsService.isParticipant(
        conversationId,
        userId,
      );

      if (!isParticipant) {
        throw new ForbiddenException('User is not a participant of this conversation');
      }

      const messages = await this.messageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
        take: limit,
        skip: offset,
      });

      // Update last read time
      await this.conversationsService.updateLastRead(conversationId, userId);

      this.logger.log(
        `Retrieved ${messages.length} messages for conversation: ${conversationId}`,
      );
      return messages;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve messages: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve messages');
    }
  }

  /**
   * Get the total count of messages in a conversation
   */
  async getMessageCount(conversationId?: string): Promise<number> {
    try {
      if (conversationId) {
        return await this.messageRepository.count({ where: { conversationId } });
      }
      return await this.messageRepository.count();
    } catch (error) {
      this.logger.error(`Failed to count messages: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to count messages');
    }
  }

  /**
   * Update message status
   */
  async updateStatus(messageId: string, status: MessageStatus): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.status = status;
    return this.messageRepository.save(message);
  }

  /**
   * Batch mark all messages in a conversation as READ for a user
   * Only updates messages not sent by this user and not already READ
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<number> {
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.READ })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status != :readStatus', { readStatus: MessageStatus.READ })
      .andWhere('isDeleted = :isDeleted', { isDeleted: false })
      .execute();

    return result.affected || 0;
  }

  /**
   * Batch mark all messages as DELIVERED for a user when they come online
   * Updates messages sent to user that are still SENT status
   */
  async markMessagesAsDeliveredForUser(userId: string): Promise<{ updatedCount: number; conversationIds: string[] }> {
    // Get all conversations where user is a participant
    const conversations = await this.conversationsService.findByUserId(userId);
    const conversationIds = conversations.map(c => c.id);

    if (conversationIds.length === 0) {
      return { updatedCount: 0, conversationIds: [] };
    }

    // Get conversations that have SENT messages for this user
    const conversationsWithSentMessages = await this.messageRepository
      .createQueryBuilder('message')
      .select('DISTINCT message.conversationId', 'conversationId')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.status = :sentStatus', { sentStatus: MessageStatus.SENT })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .getRawMany();

    const affectedConversationIds = conversationsWithSentMessages.map(c => c.conversationId);

    if (affectedConversationIds.length === 0) {
      return { updatedCount: 0, conversationIds: [] };
    }

    // Batch update to DELIVERED
    const result = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.DELIVERED })
      .where('conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status = :sentStatus', { sentStatus: MessageStatus.SENT })
      .andWhere('isDeleted = :isDeleted', { isDeleted: false })
      .execute();

    return {
      updatedCount: result.affected || 0,
      conversationIds: affectedConversationIds,
    };
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    await this.messageRepository.remove(message);
    this.logger.log(`Message deleted: ${messageId} by user ${userId}`);
  }

  /**
   * Search messages in a specific conversation
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit = 20,
  ): Promise<Message[]> {
    // Verify user is a participant
    const isParticipant = await this.conversationsService.isParticipant(
      conversationId,
      userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('User is not a participant of this conversation');
    }

    const searchQuery = `%${query.toLowerCase()}%`;

    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('LOWER(message.content) LIKE :searchQuery', { searchQuery })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Search messages globally across all user's conversations
   */
  async searchMessagesGlobal(
    userId: string,
    query: string,
    limit = 50,
  ): Promise<Message[]> {
    // Get all conversations the user is a participant of
    const conversationIds = await this.conversationsService
      .findByUserId(userId)
      .then((convs) => convs.map((c) => c.id));

    if (conversationIds.length === 0) {
      return [];
    }

    const searchQuery = `%${query.toLowerCase()}%`;

    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('LOWER(message.content) LIKE :searchQuery', { searchQuery })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Validate message content based on message type
   */
  private validateMessageContent(dto: CreateMessageDto): void {
    if (dto.type === MessageType.TEXT && !dto.content?.trim()) {
      throw new BadRequestException('Content is required for text messages');
    }

    if ((dto.type === MessageType.IMAGE || dto.type === MessageType.FILE) && !dto.fileUrl?.trim()) {
      throw new BadRequestException('File URL is required for file messages');
    }
  }

  // ==================== Edit Message ====================

  /**
   * Edit a text message
   */
  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Only the sender can edit this message');
    }

    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException('Only text messages can be edited');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    message.content = newContent;
    message.editedAt = new Date();

    const updated = await this.messageRepository.save(message);
    this.logger.log(`Message edited: ${messageId} by user ${userId}`);

    return updated;
  }

  // ==================== Delete Message ====================

  /**
   * Delete message for everyone (only sender can do this)
   */
  async deleteMessageForEveryone(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Only the sender can delete this message for everyone');
    }

    message.isDeleted = true;
    message.content = null; // Clear content
    await this.messageRepository.save(message);
    this.logger.log(`Message deleted for everyone: ${messageId} by user ${userId}`);
  }

  /**
   * Delete message for me only (hide from my view)
   */
  async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if already deleted for this user
    const existing = await this.deletionRepository.findOne({
      where: { messageId, userId },
    });

    if (!existing) {
      const deletion = this.deletionRepository.create({ messageId, userId });
      await this.deletionRepository.save(deletion);
    }

    this.logger.log(`Message deleted for me: ${messageId} by user ${userId}`);
  }

  /**
   * Get messages excluding those deleted for the user
   */
  async findByConversationIdFiltered(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    // Get message IDs deleted for this user
    const deletedForMe = await this.deletionRepository.find({
      where: { userId },
      select: ['messageId'],
    });
    const deletedMessageIds = deletedForMe.map((d) => d.messageId);

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false });

    if (deletedMessageIds.length > 0) {
      queryBuilder.andWhere('message.id NOT IN (:...deletedMessageIds)', { deletedMessageIds });
    }

    return queryBuilder
      .orderBy('message.createdAt', 'ASC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  // ==================== Forward Message ====================

  /**
   * Forward a message to another conversation
   */
  async forwardMessage(
    messageId: string,
    userId: string,
    targetConversationId: string,
  ): Promise<Message> {
    const originalMessage = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!originalMessage) {
      throw new NotFoundException('Original message not found');
    }

    // Verify user is participant of target conversation
    const isParticipant = await this.conversationsService.isParticipant(
      targetConversationId,
      userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('User is not a participant of the target conversation');
    }

    const forwardedMessage = this.messageRepository.create({
      conversationId: targetConversationId,
      senderId: userId,
      content: originalMessage.content,
      type: originalMessage.type,
      fileUrl: originalMessage.fileUrl,
      fileName: originalMessage.fileName,
      fileMimeType: originalMessage.fileMimeType,
      fileSize: originalMessage.fileSize,
      forwardedFromId: messageId,
      status: MessageStatus.SENT,
    });

    const saved = await this.messageRepository.save(forwardedMessage);
    this.logger.log(`Message forwarded: ${messageId} -> ${saved.id} to conversation ${targetConversationId}`);

    return saved;
  }

  // ==================== Reactions ====================

  /**
   * Add or update reaction to a message
   */
  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageReaction> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user already reacted
    let existingReaction = await this.reactionRepository.findOne({
      where: { messageId, userId },
    });

    if (existingReaction) {
      // Update existing reaction
      existingReaction.reaction = reaction;
      return this.reactionRepository.save(existingReaction);
    }

    // Create new reaction
    const newReaction = this.reactionRepository.create({
      messageId,
      userId,
      reaction,
    });

    return this.reactionRepository.save(newReaction);
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    await this.reactionRepository.delete({ messageId, userId });
  }

  /**
   * Get all reactions for a message
   */
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    return this.reactionRepository.find({
      where: { messageId },
    });
  }

  /**
   * Get reactions summary (grouped by reaction type)
   */
  async getReactionsSummary(messageId: string): Promise<{ reaction: string; count: number; users: string[] }[]> {
    const reactions = await this.reactionRepository.find({
      where: { messageId },
    });

    const summary = new Map<string, string[]>();
    
    reactions.forEach((r) => {
      if (!summary.has(r.reaction)) {
        summary.set(r.reaction, []);
      }
      summary.get(r.reaction)!.push(r.userId);
    });

    return Array.from(summary.entries()).map(([reaction, users]) => ({
      reaction,
      count: users.length,
      users,
    }));
  }

  /**
   * Get message by ID
   */
  async findById(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  // ==================== MEDIA GALLERY ====================

  /**
   * Get all images in a conversation
   */
  async getConversationImages(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: Message[]; total: number; page: number; totalPages: number }> {
    const [items, total] = await this.messageRepository.findAndCount({
      where: {
        conversationId,
        type: MessageType.IMAGE,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all videos in a conversation
   */
  async getConversationVideos(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: Message[]; total: number; page: number; totalPages: number }> {
    const [items, total] = await this.messageRepository.findAndCount({
      where: {
        conversationId,
        type: MessageType.VIDEO,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all files/documents in a conversation
   */
  async getConversationFiles(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: Message[]; total: number; page: number; totalPages: number }> {
    const [items, total] = await this.messageRepository.findAndCount({
      where: {
        conversationId,
        type: MessageType.FILE,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all links shared in a conversation
   * Extracts URLs from text messages
   */
  async getConversationLinks(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: { message: Message; links: string[] }[]; total: number; page: number; totalPages: number }> {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^\[\]`]+)/gi;

    // Get all text messages in the conversation
    const messages = await this.messageRepository.find({
      where: {
        conversationId,
        type: MessageType.TEXT,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });

    // Filter messages that contain links
    const messagesWithLinks = messages
      .map((message) => {
        const links = message.content?.match(urlRegex) || [];
        return { message, links };
      })
      .filter((item) => item.links.length > 0);

    const total = messagesWithLinks.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = messagesWithLinks.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all media (images + videos) in a conversation
   */
  async getConversationMedia(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: Message[]; total: number; page: number; totalPages: number }> {
    const [items, total] = await this.messageRepository.findAndCount({
      where: [
        { conversationId, type: MessageType.IMAGE, isDeleted: false },
        { conversationId, type: MessageType.VIDEO, isDeleted: false },
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get storage summary for a conversation
   */
  async getConversationStorageSummary(conversationId: string): Promise<{
    images: { count: number; totalSize: number };
    videos: { count: number; totalSize: number };
    files: { count: number; totalSize: number };
    links: { count: number };
    total: { count: number; totalSize: number };
  }> {
    // Count and sum sizes for each type
    const imageStats = await this.messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(message.fileSize), 0)', 'totalSize')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.type = :type', { type: MessageType.IMAGE })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    const videoStats = await this.messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(message.fileSize), 0)', 'totalSize')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.type = :type', { type: MessageType.VIDEO })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    const fileStats = await this.messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(message.fileSize), 0)', 'totalSize')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.type = :type', { type: MessageType.FILE })
      .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    // Count links
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^\[\]`]+)/gi;
    const textMessages = await this.messageRepository.find({
      where: {
        conversationId,
        type: MessageType.TEXT,
        isDeleted: false,
      },
      select: ['content'],
    });
    
    const linkCount = textMessages.reduce((count, msg) => {
      const links = msg.content?.match(urlRegex) || [];
      return count + links.length;
    }, 0);

    return {
      images: {
        count: parseInt(imageStats.count) || 0,
        totalSize: parseInt(imageStats.totalSize) || 0,
      },
      videos: {
        count: parseInt(videoStats.count) || 0,
        totalSize: parseInt(videoStats.totalSize) || 0,
      },
      files: {
        count: parseInt(fileStats.count) || 0,
        totalSize: parseInt(fileStats.totalSize) || 0,
      },
      links: {
        count: linkCount,
      },
      total: {
        count:
          (parseInt(imageStats.count) || 0) +
          (parseInt(videoStats.count) || 0) +
          (parseInt(fileStats.count) || 0),
        totalSize:
          (parseInt(imageStats.totalSize) || 0) +
          (parseInt(videoStats.totalSize) || 0) +
          (parseInt(fileStats.totalSize) || 0),
      },
    };
  }
}
