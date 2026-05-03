import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAction, ContentEntityType, UserRole } from '@prisma/client';
import { AdminActivityService } from '../admin-activity/admin-activity.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units.query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitRepository } from './repositories/unit.repository';

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitRepository: UnitRepository,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  async createUnit(currentUser: AuthUser, createUnitDto: CreateUnitDto) {
    const existingUnit = await this.unitRepository.findBySlug(
      createUnitDto.slug,
    );

    if (existingUnit) {
      throw new ConflictException('Unit slug already exists');
    }

    const createdUnit = await this.unitRepository.create({
      slug: createUnitDto.slug,
      title: createUnitDto.title,
      titleTranslations: this.buildTranslations(createUnitDto.title),
      description: createUnitDto.description,
      descriptionTranslations: createUnitDto.description
        ? this.buildTranslations(createUnitDto.description)
        : undefined,
      curriculumLevel: createUnitDto.curriculumLevel,
      orderIndex: createUnitDto.orderIndex,
      isPublished: createUnitDto.isPublished ?? false,
      publishedAt: createUnitDto.isPublished ? new Date() : undefined,
      createdById: currentUser.sub,
      updatedById: currentUser.sub,
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.CREATE,
      entityType: ContentEntityType.UNIT,
      entityId: createdUnit.id,
      afterData: createdUnit,
    });

    return createdUnit;
  }

  async listUnits(currentUser: AuthUser, query: ListUnitsQueryDto) {
    return this.unitRepository.list(currentUser, query);
  }

  async getUnitById(unitId: string) {
    const unit = await this.unitRepository.findById(unitId);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async getAccessibleUnitById(currentUser: AuthUser, unitId: string) {
    const unit = await this.getUnitById(unitId);

    if (currentUser.role === UserRole.PARENT && !unit.isPublished) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async updateUnit(
    currentUser: AuthUser,
    unitId: string,
    updateUnitDto: UpdateUnitDto,
  ) {
    const unit = await this.unitRepository.findById(unitId);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (updateUnitDto.slug && updateUnitDto.slug !== unit.slug) {
      const existingUnit = await this.unitRepository.findBySlug(
        updateUnitDto.slug,
      );

      if (existingUnit) {
        throw new ConflictException('Unit slug already exists');
      }
    }

    const updatedUnit = await this.unitRepository.update(unitId, {
      ...(updateUnitDto.slug ? { slug: updateUnitDto.slug } : {}),
      ...(updateUnitDto.title
        ? {
            title: updateUnitDto.title,
            titleTranslations: this.buildTranslations(updateUnitDto.title),
          }
        : {}),
      ...(typeof updateUnitDto.description === 'string'
        ? {
            description: updateUnitDto.description,
            descriptionTranslations: this.buildTranslations(
              updateUnitDto.description,
            ),
          }
        : {}),
      ...(typeof updateUnitDto.curriculumLevel === 'number'
        ? { curriculumLevel: updateUnitDto.curriculumLevel }
        : {}),
      ...(typeof updateUnitDto.orderIndex === 'number'
        ? { orderIndex: updateUnitDto.orderIndex }
        : {}),
      ...(typeof updateUnitDto.isPublished === 'boolean'
        ? {
            isPublished: updateUnitDto.isPublished,
            publishedAt: updateUnitDto.isPublished ? new Date() : null,
          }
        : {}),
      updatedById: currentUser.sub,
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action:
        typeof updateUnitDto.isPublished === 'boolean'
          ? updateUnitDto.isPublished
            ? AdminAction.PUBLISH
            : AdminAction.UNPUBLISH
          : AdminAction.UPDATE,
      entityType: ContentEntityType.UNIT,
      entityId: updatedUnit.id,
      beforeData: unit,
      afterData: updatedUnit,
    });

    return updatedUnit;
  }

  async deleteUnit(currentUser: AuthUser, unitId: string) {
    const unit = await this.unitRepository.findById(unitId);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitRepository.delete(unitId);
    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.DELETE,
      entityType: ContentEntityType.UNIT,
      entityId: unit.id,
      beforeData: unit,
    });

    return {
      message: 'Unit deleted successfully',
    };
  }

  private buildTranslations(value: string) {
    return {
      en: value,
    };
  }
}
