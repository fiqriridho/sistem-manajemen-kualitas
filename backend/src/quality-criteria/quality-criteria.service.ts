import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateQualityCriteriaDto } from './dto/create-quality-criteria.dto.js';
import { UpdateQualityCriteriaDto } from './dto/update-quality-criteria.dto.js';

@Injectable()
export class QualityCriteriaService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateQualityCriteriaDto) {
    return this.prisma.quality_criteria.create({
      data: {
        productId: data.productId,
        name: data.name,
        description: data.description,
        method: data.method,
        standard: data.standard,
        isRequired: data.isRequired ?? true,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.quality_criteria.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
  async findActive() {
    return this.prisma.quality_criteria.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const criteria = await this.prisma.quality_criteria.findUnique({ where: { id } });
    if (!criteria) {
      throw new NotFoundException(`Kriteria dengan ID ${id} tidak ditemukan`);
    }
    return criteria;
  }

  async update(id: string, data: UpdateQualityCriteriaDto) {
    const criteria = await this.prisma.quality_criteria.findUnique({ where: { id } });
    if (!criteria) {
      throw new NotFoundException(`Kriteria dengan ID ${id} tidak ditemukan`);
    }
    return this.prisma.quality_criteria.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        standard: data.standard,
        isRequired: data.isRequired,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    const criteria = await this.prisma.quality_criteria.findUnique({ where: { id } });
    if (!criteria) {
      throw new NotFoundException(`Kriteria dengan ID ${id} tidak ditemukan`);
    }
    await this.prisma.quality_criteria.delete({ where: { id } });
    return { message: 'Kriteria berhasil dihapus' };
  }
}
