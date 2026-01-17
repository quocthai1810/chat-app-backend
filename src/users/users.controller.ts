import { Controller, Get, Post, Put, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UserResponseDto } from './dto';

/**
 * Users Controller
 * REST API endpoints for user management
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Register a new user in the chat system',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username already exists',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    };
  }

  /**
   * Get all users
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve list of all registered users',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    }));
  }

  /**
   * Get online users (MUST be before /:id to avoid route conflict)
   */
  @Get('online')
  @ApiOperation({
    summary: 'Get online users',
    description: 'Retrieve list of currently online users',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of online users',
    type: [UserResponseDto],
  })
  async getOnlineUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.getOnlineUsers();

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    }));
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    };
  }

  /**
   * Update user profile
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update user display name or avatar',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: { displayName?: string; avatar?: string },
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    };
  }
}
