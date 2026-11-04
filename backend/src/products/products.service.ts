import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    return this.prisma.products.create({
      data: {
        code: data.code,
        name: data.name,
        slug: data.slug,
        description: data.description,
        categoryId: data.categoryId,
        status: data.status,
      },
    });
  }

  async findAll(user: AuthUser, query: ProductQueryDto = {}) {
    const where: Prisma.productsWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
      ];
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.products.findMany({
      where,
      include: {
        categories: true,
        evaluations: { where: this.evaluationWhere(user) },
      },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: {
        categories: true,
        evaluations: { where: this.evaluationWhere(user) },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product dengan ID ${id} tidak ditemukan`);
    }
    return product;
  }

  async findByCategoryId(categoryId: string) {
    return this.prisma.products.findMany({
      where: { categoryId },
      include: { categories: true },
    });
  }

  async update(id: string, data: UpdateProductDto) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product dengan ID ${id} tidak ditemukan`);
    }
    return this.prisma.products.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        slug: data.slug,
        description: data.description,
        categoryId: data.categoryId,
        status: data.status,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product dengan ID ${id} tidak ditemukan`);
    }

    const evaluationCount = await this.prisma.evaluations.count({
      where: { productId: id },
    });

    if (evaluationCount > 0) {
      throw new ConflictException(
        'Produk tidak dapat dihapus karena masih memiliki riwayat evaluasi. Nonaktifkan produk dengan status INACTIVE.',
      );
    }

    await this.prisma.products.delete({
      where: { id },
    });
    return { message: 'Product berhasil dihapus' };
  }

  private evaluationWhere(user: AuthUser) {
    return user.role === 'EVALUATOR' ? { evaluatorId: user.userId } : {};
  }
}
