import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRepository } from '../auth/repositories/user.repository';
import { ChildrenService } from '../children/children.service';

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

  private ensureParentAccess(currentUser: AuthUser, parentId: string) {
    if (currentUser.role === UserRole.PARENT && currentUser.sub !== parentId) {
      throw new ForbiddenException(
        'You do not have access to another parent profile',
      );
    }
  }
}
