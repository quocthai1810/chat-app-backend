import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MessageType } from '../enums/message-type.enum';

/**
 * Message Status Enum
 */
export enum MessageStatus {
  SENDING = 'SENDING',   // Client sending
  SENT = 'SENT',         // Saved to server
  DELIVERED = 'DELIVERED', // Delivered to recipient
  READ = 'READ',         // Read by recipient
}

/**
 * Message Entity
 * Represents a chat message in the database
 */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_message_conversation')
  conversationId: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_message_sender')
  senderId: string;

  @Column({ type: 'text', nullable: true })
  @Index('idx_message_content') // For text search
  content: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null; // Original file name

  @Column({ type: 'varchar', length: 100, nullable: true })
  fileMimeType: string | null; // MIME type of the file

  @Column({ type: 'integer', nullable: true })
  fileSize: number | null; // File size in bytes

  @Column({
    type: 'varchar',
    length: 20,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean; // Soft delete for everyone

  @Column({ type: 'varchar', length: 36, nullable: true })
  replyToMessageId: string | null; // For message replies

  @Column({ type: 'varchar', length: 36, nullable: true })
  forwardedFromId: string | null; // Original message if forwarded

  @Column({ type: 'datetime', nullable: true })
  editedAt: Date | null; // When message was last edited

  @CreateDateColumn({ type: 'datetime' })
  @Index('idx_message_created_at')
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
