import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import type { users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; name: string; role?: users_role }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.users.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'EVALUATOR',
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.users.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
  }

  async findOneByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: { email?: string; name?: string; role?: users_role; isActive?: boolean }) {
    return this.prisma.users.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
  }

  async remove(id: string) {
    return this.prisma.users.delete({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });
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

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }
}
