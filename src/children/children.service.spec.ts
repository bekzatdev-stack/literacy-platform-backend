import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ChildRepository } from './repositories/child.repository';
import { ChildrenService } from './children.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('ChildrenService', () => {
  let service: ChildrenService;
  let childRepository: jest.Mocked<ChildRepository>;

  beforeEach(() => {
    childRepository = {
      findByUsername: jest.fn(),
      create: jest.fn(),
      listForUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ChildRepository>;

    service = new ChildrenService(childRepository);
  });

  it('creates a child profile with a hashed PIN', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-pin' as never);
    childRepository.findByUsername.mockResolvedValue(null);
    childRepository.create.mockResolvedValue({
      id: 'child-1',
      parentId: 'parent-1',
      username: 'ali_reader',
      displayName: 'Ali',
      age: 6,
      avatarUrl: null,
      currentCurriculumLevel: 1,
      gamificationLevel: 1,
      xpPoints: 0,
      streakCount: 0,
      overallProgressPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.createChild(
      {
        sub: 'parent-1',
        role: UserRole.PARENT,
        accountType: 'USER',
        tokenType: 'access',
      },
      {
        username: 'ali_reader',
        pin: '1234',
        displayName: 'Ali',
        age: 6,
        avatarUrl: null,
        learningLevel: 1,
      },
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
    expect(childRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'ali_reader',
        pinHash: 'hashed-pin',
      }),
    );
    expect(result.displayName).toBe('Ali');
  });

  it('rejects duplicate child usernames', async () => {
    childRepository.findByUsername.mockResolvedValue({
      id: 'existing-child',
    } as never);

    await expect(
      service.createChild(
        {
          sub: 'parent-1',
          role: UserRole.PARENT,
          accountType: 'USER',
          tokenType: 'access',
        },
        {
          username: 'ali_reader',
          pin: '1234',
          displayName: 'Ali',
          age: 6,
          avatarUrl: null,
          learningLevel: 1,
        },
      ),
    ).rejects.toThrow(new ConflictException('Child username already exists'));
  });

  it('prevents one parent from accessing another parent child profile', async () => {
    childRepository.findById.mockResolvedValue({
      id: 'child-1',
      parentId: 'another-parent',
    } as never);

    await expect(
      service.getAccessibleChildEntityOrThrow(
        {
          sub: 'parent-1',
          role: UserRole.PARENT,
          accountType: 'USER',
          tokenType: 'access',
        },
        'child-1',
      ),
    ).rejects.toThrow(
      new ForbiddenException('You do not have access to this child profile'),
    );
  });

  it('throws when the child profile does not exist', async () => {
    childRepository.findById.mockResolvedValue(null);

    await expect(
      service.getAccessibleChildEntityOrThrow(
        {
          sub: 'admin-1',
          role: UserRole.ADMIN,
          accountType: 'USER',
          tokenType: 'access',
        },
        'missing-child',
      ),
    ).rejects.toThrow(new NotFoundException('Child profile not found'));
  });
});
