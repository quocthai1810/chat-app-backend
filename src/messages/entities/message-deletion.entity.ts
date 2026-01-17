import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Message Deletion Entity
 * Tracks messages deleted "for me" by users
 * When a user deletes a message "for me", it's hidden only for that user
 */
@Entity('message_deletions')
@Unique(['messageId', 'userId'])
export class MessageDeletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_deletion_message')
  messageId: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_deletion_user')
  userId: string;

  @CreateDateColumn({ type: 'datetime' })
  deletedAt: Date;
}
