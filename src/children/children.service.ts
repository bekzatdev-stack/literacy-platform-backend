import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateChildDto } from './dto/create-child.dto';
import { ListChildrenQueryDto } from './dto/list-children.query.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { ChildRepository } from './repositories/child.repository';

const PIN_SALT_ROUNDS = 10;

@Injectable()
export class ChildrenService {
  constructor(private readonly childRepository: ChildRepository) {}

  async createChild(currentUser: AuthUser, createChildDto: CreateChildDto) {
    const existingChild = await this.childRepository.findByUsername(
      createChildDto.username,
    );

    if (existingChild) {
      throw new ConflictException('Child username already exists');
    }

    const pinHash = await bcrypt.hash(createChildDto.pin, PIN_SALT_ROUNDS);

    const child = await this.childRepository.create({
      username: createChildDto.username,
      pinHash,
      displayName: createChildDto.displayName,
      age: createChildDto.age,
      avatarUrl: createChildDto.avatarUrl,
      currentCurriculumLevel: createChildDto.learningLevel ?? 1,
      parent: {
        connect: {
          id: currentUser.sub,
        },
      },
    });

    return this.formatChildResponse(child);
  }

  async listChildren(currentUser: AuthUser, query: ListChildrenQueryDto) {
    const result = await this.childRepository.listForUser(currentUser, query);

    return {
      items: result.items.map((child) => this.formatChildResponse(child)),
      meta: result.meta,
    };
  }

  async getChildById(currentUser: AuthUser, childId: string) {
    const child = await this.getAccessibleChildEntityOrThrow(
      currentUser,
      childId,
    );
    return this.formatChildResponse(child);
  }

  async updateChild(
    currentUser: AuthUser,
    childId: string,
    updateChildDto: UpdateChildDto,
  ) {
    const child = await this.getAccessibleChildEntityOrThrow(
      currentUser,
      childId,
    );

    if (updateChildDto.username && updateChildDto.username !== child.username) {
      const existingChild = await this.childRepository.findByUsername(
        updateChildDto.username,
      );

      if (existingChild) {
        throw new ConflictException('Child username already exists');
      }
    }

    const childToUpdate = {
      ...(updateChildDto.username ? { username: updateChildDto.username } : {}),
      ...(updateChildDto.displayName
        ? { displayName: updateChildDto.displayName }
        : {}),
      ...(typeof updateChildDto.age === 'number'
        ? { age: updateChildDto.age }
        : {}),
      ...(typeof updateChildDto.avatarUrl === 'string'
        ? { avatarUrl: updateChildDto.avatarUrl }
        : {}),
      ...(typeof updateChildDto.learningLevel === 'number'
        ? { currentCurriculumLevel: updateChildDto.learningLevel }
        : {}),
      ...(updateChildDto.pin
        ? {
            pinHash: await bcrypt.hash(updateChildDto.pin, PIN_SALT_ROUNDS),
          }
        : {}),
    };

    const updatedChild = await this.childRepository.update(
      childId,
      childToUpdate,
    );

    return this.formatChildResponse(updatedChild);
  }

  async deleteChild(currentUser: AuthUser, childId: string) {
    await this.getAccessibleChildEntityOrThrow(currentUser, childId);
    await this.childRepository.delete(childId);

    return {
      message: 'Child profile deleted successfully',
    };
  }

  async getAccessibleChildEntityOrThrow(
    currentUser: AuthUser,
    childId: string,
  ) {
    const child = await this.childRepository.findById(childId);

    if (!child) {
      throw new NotFoundException('Child profile not found');
    }

    if (
      currentUser.role === UserRole.PARENT &&
      child.parentId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You do not have access to this child profile',
      );
    }

    return child;
  }

  formatChildResponse(child: {
    id: string;
    parentId: string;
    username: string;
    displayName: string;
    age: number;
    avatarUrl: string | null;
    currentCurriculumLevel: number;
    gamificationLevel: number;
    xpPoints: number;
    streakCount: number;
    overallProgressPercent: { toString(): string } | number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: child.id,
      parentId: child.parentId,
      username: child.username,
      displayName: child.displayName,
      age: child.age,
      avatarUrl: child.avatarUrl,
      learningLevel: child.currentCurriculumLevel,
      gamificationLevel: child.gamificationLevel,
      xpPoints: child.xpPoints,
      streakCount: child.streakCount,
      overallProgressPercent: Number(child.overallProgressPercent),
      isActive: child.isActive,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    };
  }
}
