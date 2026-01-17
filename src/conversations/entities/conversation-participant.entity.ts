import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/**
 * Participant Role Enum
 */
export enum ParticipantRole {
  ADMIN = 'ADMIN',   // Can manage group, add/remove members
  MEMBER = 'MEMBER', // Regular member
}

/**
 * Conversation Participant Entity
 * Represents a user's participation in a conversation
 */
@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_participant_conversation')
  conversationId: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_participant_user')
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ParticipantRole.MEMBER,
  })
  role: ParticipantRole; // Admin or Member

  @Column({ type: 'datetime', nullable: true })
  lastReadAt: Date | null; // Track when user last read messages

  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null; // Nickname in this conversation

  @ManyToOne(() => Conversation, (conversation) => conversation.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @CreateDateColumn({ type: 'datetime' })
  joinedAt: Date;
}
