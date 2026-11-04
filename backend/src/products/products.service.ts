import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
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
      },
    });
  }

  async findAll() {
    return this.prisma.products.findMany({
      include: { categories: true, evaluations: true },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: { categories: true, evaluations: true },
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
    await this.prisma.products.delete({
      where: { id },
    });
    return { message: 'Product berhasil dihapus' };
  }
}
