import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Common reaction types
 */
export enum ReactionType {
  LIKE = '👍',
  LOVE = '❤️',
  LAUGH = '😆',
  WOW = '😮',
  SAD = '😢',
  ANGRY = '😠',
}

/**
 * Message Reaction Entity
 * Represents a user's reaction to a message
 */
@Entity('message_reactions')
@Unique(['messageId', 'userId']) // One reaction per user per message
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_reaction_message')
  messageId: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_reaction_user')
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  reaction: string; // Emoji character or ReactionType

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
