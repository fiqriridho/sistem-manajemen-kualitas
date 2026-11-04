import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import type { users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthUser } from '../common/types/auth-user.js';

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; name: string; role?: users_role }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    try {
      return await this.prisma.users.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role || 'EVALUATOR',
        },
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.users.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: { email?: string; name?: string; role?: users_role; isActive?: boolean }) {
    try {
      return await this.prisma.users.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const evaluationCount = await this.prisma.evaluations.count({
      where: { evaluatorId: id },
    });

    if (evaluationCount > 0) {
      throw new ConflictException('User has evaluation history');
    }

    try {
      return await this.prisma.users.delete({
        where: { id },
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async findActiveAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user?.isActive) {
      return null;
    }

    return { userId: user.id, email: user.email, role: user.role };
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }
}
