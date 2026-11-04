import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { rethrowPrismaError } from '../common/prisma-error.js';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto) {
    try {
      return await this.prisma.categories.create({
        data: {
          name: data.name,
          slug: data.slug,
        },
      });
    } catch (error) {
      rethrowPrismaError(error, {
        duplicate: 'Kategori dengan nama atau slug tersebut sudah ada.',
      });
    }
  }

  async findAll() {
    return this.prisma.categories.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.categories.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  async update(id: string, data: UpdateCategoryDto) {
    const category = await this.prisma.categories.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }
    try {
      return await this.prisma.categories.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
        },
      });
    } catch (error) {
      rethrowPrismaError(error, {
        duplicate: 'Kategori dengan nama atau slug tersebut sudah ada.',
        notFound: `Kategori dengan ID ${id} tidak ditemukan`,
      });
    }
  }

  async remove(id: string) {
    const category = await this.prisma.categories.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }

    const productCount = await this.prisma.products.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        'Kategori tidak dapat dihapus karena masih memiliki produk. Nonaktifkan produk atau pindahkan produk ke kategori lain terlebih dahulu.',
      );
    }

    await this.prisma.categories.delete({ where: { id } });
    return { message: 'Kategori berhasil dihapus' };
  }
}
