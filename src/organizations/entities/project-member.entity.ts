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
import { Project } from './project.entity';

/**
 * Project role enum
 */
export enum ProjectRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Project Member Entity
 * Represents a user's membership in a project
 */
@Entity('project_members')
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_pm_project')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 36 })
  @Index('idx_pm_user')
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProjectRole.MEMBER,
  })
  role: ProjectRole;

  @CreateDateColumn()
  joinedAt: Date;
}
