import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Department,
  Project,
  ProjectMember,
} from './entities';
import { OrganizationsService } from './organizations.service';
import {
  DepartmentsController,
  ProjectsController,
} from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Project,
      ProjectMember,
    ]),
  ],
  controllers: [
    DepartmentsController,
    ProjectsController,
  ],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
