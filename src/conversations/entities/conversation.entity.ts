import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity';

/**
 * Conversation Type Enum
 */
export enum ConversationType {
  PRIVATE = 'PRIVATE', // 1-1 chat
  GROUP = 'GROUP',     // Group chat
}

/**
 * Conversation Category Enum
 * Used to categorize group conversations
 */
export enum ConversationCategory {
  GENERAL = 'GENERAL',       // General group chat
  DEPARTMENT = 'DEPARTMENT', // Department-based chat
  PROJECT = 'PROJECT',       // Project-based chat
  TEAM = 'TEAM',            // Team/working group chat
}

/**
 * Conversation Entity
 * Represents a chat conversation (1-1 or group)
 */
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationType.PRIVATE,
  })
  type: ConversationType;

  @Column({
    type: 'varchar',
    length: 20,
    default: ConversationCategory.GENERAL,
  })
  @Index('idx_conv_category')
  category: ConversationCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null; // Only for GROUP type

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null; // Only for GROUP type

  @Column({ type: 'text', nullable: true })
  description: string | null; // Group description

  // Last message preview fields
  @Column({ type: 'varchar', length: 36, nullable: true })
  lastMessageId: string | null;

  @Column({ type: 'text', nullable: true })
  lastMessageContent: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  lastMessageSenderId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  lastMessageType: string | null; // TEXT, IMAGE, VIDEO, FILE

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  // Department association (for department chats)
  @Column({ type: 'varchar', length: 36, nullable: true })
  @Index('idx_conv_dept')
  departmentId: string | null;

  // Project association (for project chats)
  @Column({ type: 'varchar', length: 36, nullable: true })
  @Index('idx_conv_project')
  projectId: string | null;

  @OneToMany(() => ConversationParticipant, (participant) => participant.conversation)
  participants: ConversationParticipant[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
