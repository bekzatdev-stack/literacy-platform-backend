import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithChildren(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async updateParent(
    id: string,
    data: Pick<Prisma.UserUpdateInput, 'email' | 'firstName' | 'lastName'>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        children: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async createParent(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.PARENT,
      },
    });
  }

  async createAdmin(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
    });
  }
}
