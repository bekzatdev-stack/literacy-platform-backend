import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRepository } from '../auth/repositories/user.repository';
import { ChildrenService } from '../children/children.service';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly childrenService: ChildrenService,
  ) {}

  async getParentProfile(currentUser: AuthUser, parentId: string) {
    this.ensureParentAccess(currentUser, parentId);

    const parent = await this.userRepository.findByIdWithChildren(parentId);

    if (!parent || parent.role !== UserRole.PARENT) {
      throw new NotFoundException('Parent profile not found');
    }

    return {
      id: parent.id,
      email: parent.email,
      firstName: parent.firstName,
      lastName: parent.lastName,
      role: parent.role,
      childrenCount: parent.children.length,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
    };
  }

  async getParentChildren(currentUser: AuthUser, parentId: string) {
    this.ensureParentAccess(currentUser, parentId);

    const parent = await this.userRepository.findByIdWithChildren(parentId);

    if (!parent || parent.role !== UserRole.PARENT) {
      throw new NotFoundException('Parent profile not found');
    }

    return {
      parentId: parent.id,
      items: parent.children.map((child) =>
        this.childrenService.formatChildResponse(child),
      ),
    };
  }

  async updateParentProfile(
    currentUser: AuthUser,
    parentId: string,
    updateParentDto: UpdateParentDto,
  ) {
    this.ensureParentAccess(currentUser, parentId);

    const parent = await this.userRepository.findByIdWithChildren(parentId);

    if (!parent || parent.role !== UserRole.PARENT) {
      throw new NotFoundException('Parent profile not found');
    }

    if (updateParentDto.email && updateParentDto.email !== parent.email) {
      const existingUser = await this.userRepository.findByEmail(
        updateParentDto.email,
      );

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updatedParent = await this.userRepository.updateParent(parentId, {
      ...(updateParentDto.email ? { email: updateParentDto.email } : {}),
      ...(updateParentDto.firstName
        ? { firstName: updateParentDto.firstName }
        : {}),
      ...(typeof updateParentDto.lastName === 'string'
        ? { lastName: updateParentDto.lastName }
        : {}),
    });

    return {
      id: updatedParent.id,
      email: updatedParent.email,
      firstName: updatedParent.firstName,
      lastName: updatedParent.lastName,
      role: updatedParent.role,
      childrenCount: updatedParent.children.length,
      createdAt: updatedParent.createdAt,
      updatedAt: updatedParent.updatedAt,
    };
  }

  private ensureParentAccess(currentUser: AuthUser, parentId: string) {
    if (currentUser.role === UserRole.PARENT && currentUser.sub !== parentId) {
      throw new ForbiddenException(
        'You do not have access to another parent profile',
      );
    }
  }
}
