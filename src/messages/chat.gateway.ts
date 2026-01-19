import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessagesService } from './messages.service';
import { MessageStatus } from './entities/message.entity';

/**
 * Chat Gateway
 * WebSocket server for real-time private chat functionality
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  
  // userId -> Set of socketIds (user can have multiple connections)
  private userSockets: Map<string, Set<string>> = new Map();
  // socketId -> userId
  private socketUsers: Map<string, string> = new Map();

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Called after the gateway is initialized
   */
  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  /**
   * Called when a client connects
   */
  handleConnection(client: Socket): void {
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      // Store socket -> user mapping
      this.socketUsers.set(client.id, userId);
      
      // Store user -> sockets mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      
      // Auto mark messages as DELIVERED when user comes online
      this.markMessagesAsDeliveredForUser(userId);
      
      // Notify about user coming online
      this.server.emit('userOnline', {
        userId,
        onlineUsers: this.getOnlineUserIds(),
      });
    } else {
      this.logger.log(`Client connected: ${client.id} (Anonymous - will be rejected)`);
      client.emit('error', { message: 'userId is required' });
      client.disconnect();
    }
  }

  /**
   * Called when a client disconnects
   */
  handleDisconnect(client: Socket): void {
    const userId = this.socketUsers.get(client.id);
    
    if (userId) {
      // Remove socket from user's socket set
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        
        // If user has no more connections, remove from map
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Notify about user going offline
          this.server.emit('userOffline', {
            userId,
            onlineUsers: this.getOnlineUserIds(),
          });
        }
      }
      
      this.socketUsers.delete(client.id);
    }
    
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId || 'unknown'})`);
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = this.socketUsers.get(client.id);
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`User ${userId} joined conversation: ${data.conversationId}`);
    
    client.emit('joinedConversation', { conversationId: data.conversationId });
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} left conversation: ${data.conversationId}`);
  }

  /**
   * Handle typing indicator for a conversation
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    // Broadcast typing status to other participants in the conversation
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Mark messages as read in a conversation (when user opens chat)
   * FE emit này khi user mở cuộc trò chuyện
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = this.socketUsers.get(client.id);
    if (!userId || !data.conversationId) return;

    try {
      // Batch update all messages to READ
      const updatedCount = await this.messagesService.markConversationAsRead(
        data.conversationId,
        userId,
      );

      if (updatedCount > 0) {
        // Notify all participants in conversation
        this.server.to(`conversation:${data.conversationId}`).emit('messagesRead', {
          conversationId: data.conversationId,
          readBy: userId,
          readAt: new Date(),
          updatedCount,
        });
        this.logger.log(`${updatedCount} messages marked as READ in conversation ${data.conversationId} by user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
    }
  }

  /**
   * Auto mark all unread messages as DELIVERED when user comes online
   */
  private async markMessagesAsDeliveredForUser(userId: string): Promise<void> {
    try {
      const result = await this.messagesService.markMessagesAsDeliveredForUser(userId);
      
      if (result.updatedCount > 0) {
        // Notify senders about delivery
        result.conversationIds.forEach((conversationId) => {
          this.server.to(`conversation:${conversationId}`).emit('messagesDelivered', {
            conversationId,
            deliveredTo: userId,
            deliveredAt: new Date(),
          });
        });
        this.logger.log(`${result.updatedCount} messages marked as DELIVERED for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error marking messages as delivered: ${error.message}`);
    }
  }

  /**
   * Broadcast a message to all participants in a conversation
   * Gửi đến cả room (cho những ai đang trong chat) và đến từng participant (cho chat list)
   */
  broadcastToConversation(
    conversationId: string, 
    messageResponse: MessageResponseDto,
    participantIds?: string[],
  ): void {
    // 1. Emit to conversation room (for users currently in chat)
    this.server.to(`conversation:${conversationId}`).emit('newMessage', messageResponse);
    
    // 2. Emit to all participants individually (for chat list update)
    // This ensures users not in the room still get notified
    if (participantIds && participantIds.length > 0) {
      participantIds.forEach((participantId) => {
        // Don't send to sender (they already know)
        if (participantId !== messageResponse.senderId) {
          this.sendToUser(participantId, 'conversationUpdated', {
            conversationId,
            lastMessage: {
              id: messageResponse.id,
              content: messageResponse.content,
              type: messageResponse.type,
              senderId: messageResponse.senderId,
              createdAt: messageResponse.createdAt,
            },
            updatedAt: new Date(),
          });
        }
      });
    }
    
    this.logger.log(`Message broadcasted to conversation ${conversationId}: ${messageResponse.id}`);
  }

  /**
   * Send message to specific user (all their connected devices)
   */
  sendToUser(userId: string, event: string, data: any): void {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Get list of online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
