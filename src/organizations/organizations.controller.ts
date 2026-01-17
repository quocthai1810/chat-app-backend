import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateDepartmentDto,
  CreateProjectDto,
  DepartmentResponseDto,
  ProjectResponseDto,
} from './dto';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DepartmentResponseDto })
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.organizationsService.createDepartment(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: HttpStatus.OK, type: [DepartmentResponseDto] })
  async findAllDepartments(): Promise<DepartmentResponseDto[]> {
    return this.organizationsService.findAllDepartments();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: DepartmentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findDepartmentById(
    @Param('id') id: string,
  ): Promise<DepartmentResponseDto> {
    return this.organizationsService.findDepartmentById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: HttpStatus.OK, type: DepartmentResponseDto })
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ): Promise<DepartmentResponseDto> {
    return this.organizationsService.updateDepartment(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department (soft delete)' })
  @ApiResponse({ status: HttpStatus.OK })
  async deleteDepartment(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.organizationsService.deleteDepartment(id);
    return { success: true };
  }
}

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiQuery({ name: 'userId', required: true, description: 'Creator user ID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProjectResponseDto })
  async createProject(
    @Query('userId') userId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.organizationsService.createProject(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProjectResponseDto] })
  async findAllProjects(): Promise<ProjectResponseDto[]> {
    return this.organizationsService.findAllProjects();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get projects by user' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProjectResponseDto] })
  async findProjectsByUser(
    @Param('userId') userId: string,
  ): Promise<ProjectResponseDto[]> {
    return this.organizationsService.findProjectsByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  async findProjectById(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.organizationsService.findProjectById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  async updateProject(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProjectDto>,
  ): Promise<ProjectResponseDto> {
    return this.organizationsService.updateProject(id, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to project' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID to add' })
  async addProjectMember(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean }> {
    await this.organizationsService.addProjectMember(id, userId);
    return { success: true };
  }

  @Delete(':id/members')
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID to remove' })
  async removeProjectMember(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ success: boolean }> {
    await this.organizationsService.removeProjectMember(id, userId);
    return { success: true };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get project members' })
  async getProjectMembers(@Param('id') id: string) {
    return this.organizationsService.getProjectMembers(id);
  }
}
