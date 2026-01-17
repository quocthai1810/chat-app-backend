import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * Users Service
 * Handles user management operations
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const user = this.userRepository.create({
      username: createUserDto.username,
      displayName: createUserDto.displayName,
      avatar: createUserDto.avatar ?? null,
      status: UserStatus.OFFLINE,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created: ${savedUser.id} (${savedUser.username})`);

    return savedUser;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { displayName: 'ASC' },
    });
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.findById(userId);

    user.status = status;
    if (status === UserStatus.OFFLINE) {
      user.lastSeenAt = new Date();
    }

    return this.userRepository.save(user);
  }

  /**
   * Get online users
   */
  async getOnlineUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { status: UserStatus.ONLINE },
      order: { displayName: 'ASC' },
    });
  }

  /**
   * Update user profile
   */
  async update(
    id: string,
    updateData: { displayName?: string; avatar?: string },
  ): Promise<User> {
    const user = await this.findById(id);

    if (updateData.displayName !== undefined) {
      user.displayName = updateData.displayName;
    }
    if (updateData.avatar !== undefined) {
      user.avatar = updateData.avatar;
    }

    return this.userRepository.save(user);
  }
}
