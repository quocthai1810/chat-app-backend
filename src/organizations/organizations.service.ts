import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectMember, ProjectRole } from './entities/project-member.entity';
import { CreateDepartmentDto, CreateProjectDto } from './dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Department)
    private readonly deptRepository: Repository<Department>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  // ==================== Department Methods ====================

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    const dept = new Department();
    dept.name = dto.name;
    dept.code = dto.code ?? null;
    dept.description = dto.description ?? null;
    dept.parentDepartmentId = dto.parentDepartmentId ?? null;

    const saved = await this.deptRepository.save(dept);
    this.logger.log(`Department created: ${saved.id} (${saved.name})`);
    return saved;
  }

  async findAllDepartments(): Promise<Department[]> {
    return this.deptRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findDepartmentById(id: string): Promise<Department> {
    const dept = await this.deptRepository.findOne({ where: { id } });
    if (!dept) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async updateDepartment(id: string, dto: Partial<CreateDepartmentDto>): Promise<Department> {
    const dept = await this.findDepartmentById(id);
    
    if (dto.name) dept.name = dto.name;
    if (dto.code !== undefined) dept.code = dto.code ?? null;
    if (dto.description !== undefined) dept.description = dto.description ?? null;
    if (dto.parentDepartmentId !== undefined) dept.parentDepartmentId = dto.parentDepartmentId ?? null;

    return this.deptRepository.save(dept);
  }

  async deleteDepartment(id: string): Promise<void> {
    const dept = await this.findDepartmentById(id);
    dept.isActive = false;
    await this.deptRepository.save(dept);
  }

  // ==================== Project Methods ====================

  async createProject(dto: CreateProjectDto, creatorId: string): Promise<Project> {
    // Check unique code
    const existing = await this.projectRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Project code already exists');
    }

    const project = new Project();
    project.name = dto.name;
    project.code = dto.code;
    project.description = dto.description ?? null;
    project.status = dto.status ?? ProjectStatus.ACTIVE;
    project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    project.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const savedProject = await this.projectRepository.save(project);

    // Add creator as owner
    await this.addProjectMember(savedProject.id, creatorId, ProjectRole.OWNER);

    // Add initial members
    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (memberId !== creatorId) {
          await this.addProjectMember(savedProject.id, memberId, ProjectRole.MEMBER);
        }
      }
    }

    this.logger.log(`Project created: ${savedProject.id} (${savedProject.name})`);
    return savedProject;
  }

  async findAllProjects(): Promise<Project[]> {
    return this.projectRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findProjectsByUser(userId: string): Promise<Project[]> {
    const memberships = await this.projectMemberRepository.find({
      where: { userId },
    });

    if (memberships.length === 0) {
      return [];
    }

    const projectIds = memberships.map((m) => m.projectId);
    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.id IN (:...projectIds)', { projectIds })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async updateProject(id: string, dto: Partial<CreateProjectDto>): Promise<Project> {
    const project = await this.findProjectById(id);

    if (dto.name) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description ?? null;
    if (dto.status) project.status = dto.status;
    if (dto.startDate !== undefined) project.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) project.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.projectRepository.save(project);
  }

  async addProjectMember(
    projectId: string,
    userId: string,
    role: ProjectRole = ProjectRole.MEMBER,
  ): Promise<ProjectMember> {
    const existing = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (existing) {
      throw new ConflictException('User is already a project member');
    }

    const member = new ProjectMember();
    member.projectId = projectId;
    member.userId = userId;
    member.role = role;

    return this.projectMemberRepository.save(member);
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await this.projectMemberRepository.delete({ projectId, userId });
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.projectMemberRepository.find({
      where: { projectId },
    });
  }

  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });
    return !!member;
  }
}
