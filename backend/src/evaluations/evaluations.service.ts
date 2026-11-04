import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, evaluations_status } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import { parseQualityStandard } from '../common/quality-standard.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CreateEvaluationDto } from './dto/create-evaluation.dto.js';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto.js';
import { calculateFinalStatus, parseActualValue } from './evaluation-calculator.js';

const EVALUATION_STATUSES: readonly evaluations_status[] = ['PASS', 'FAIL', 'INCOMPLETE'];

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthUser, data: CreateEvaluationDto) {
    const product = await this.prisma.products.findUnique({
      where: { id: data.productId },
      include: {
        quality_criteria: {
          where: { isActive: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${data.productId} tidak ditemukan`);
    }
    if (product.quality_criteria.length === 0) {
      throw new BadRequestException('Produk tidak memiliki kriteria aktif');
    }

    const evaluation = await this.prisma.evaluations.create({
      data: {
        productId: product.id,
        evaluatorId: user.userId,
        evaluation_details: {
          create: product.quality_criteria.map((qc) => {
            const standardSnapshot = parseQualityStandard(qc.method, qc.standard);
            return {
              quality_criteria: { connect: { id: qc.id } },
              criteriaName: qc.name,
              method: qc.method,
              standardSnapshot: standardSnapshot as Prisma.InputJsonValue,
              isRequired: qc.isRequired,
              result: 'SKIPPED',
            };
          }),
        },
      },
      include: {
        products: true,
        users: { select: { id: true, name: true, email: true, role: true } },
        evaluation_details: true,
      },
    });

    return evaluation;
  }

  async findAll(user: AuthUser, filters: { productId?: string; status?: string }) {
    const where: Prisma.evaluationsWhereInput = {};

    if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR') {
      where.evaluatorId = user.userId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.status) {
      if (!EVALUATION_STATUSES.includes(filters.status as evaluations_status)) {
        throw new BadRequestException('Status evaluasi tidak valid');
      }
      where.status = filters.status as evaluations_status;
    }

    return this.prisma.evaluations.findMany({
      where,
      include: {
        products: true,
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const evaluation = await this.prisma.evaluations.findUnique({
      where: { id },
      include: {
        products: true,
        users: { select: { id: true, name: true, email: true, role: true } },
        evaluation_details: true,
      },
    });
    if (!evaluation) {
      throw new NotFoundException(`Evaluasi dengan ID ${id} tidak ditemukan`);
    }
    this.assertCanAccess(user, evaluation.evaluatorId);
    return evaluation;
  }

  async getStatus(user: AuthUser, id: string): Promise<{ status: 'PASS' | 'FAIL' | 'INCOMPLETE' }> {
    await this.findOne(user, id);
    return { status: await this.calculateStatus(id) };
  }

  async update(user: AuthUser, id: string, data: UpdateEvaluationDto) {
    const existing = await this.prisma.evaluations.findUnique({
      where: { id },
      select: {
        id: true,
        evaluatorId: true,
        evaluation_details: {
          select: {
            id: true,
            method: true,
            standardSnapshot: true,
            isRequired: true,
            actualValue: true,
            result: true,
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Evaluasi dengan ID ${id} tidak ditemukan`);
    }
    this.assertCanAccess(user, existing.evaluatorId);

    const detailIds = data.details.map((detail) => detail.id);
    if (new Set(detailIds).size !== detailIds.length) {
      throw new BadRequestException('Detail evaluasi duplikat');
    }

    const detailsById = new Map(existing.evaluation_details.map((detail) => [detail.id, detail]));
    const updates = data.details.map((input) => {
      if (!input || typeof input !== 'object') {
        throw new BadRequestException('Detail evaluasi tidak valid');
      }
      const detail = detailsById.get(input.id);
      if (!detail) {
        throw new BadRequestException('Detail evaluasi tidak valid');
      }
      const parsed = parseActualValue(detail.method, detail.standardSnapshot, input.actualValue);
      return { id: detail.id, actualValue: parsed.value, result: parsed.result };
    });

    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const updated = await tx.evaluation_details.updateMany({
          where: { id: update.id, evaluationId: id },
          data: {
            actualValue: update.actualValue,
            result: update.result,
          },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Detail evaluasi tidak valid');
        }
      }

      const details = await tx.evaluation_details.findMany({
        where: { evaluationId: id },
        select: { isRequired: true, actualValue: true, result: true },
      });
      const status = calculateFinalStatus(details);
      await tx.evaluations.update({
        where: { id },
        data: { status },
      });
    });

    return this.prisma.evaluations.findUnique({
      where: { id },
      include: {
        products: true,
        users: { select: { id: true, name: true, email: true, role: true } },
        evaluation_details: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.evaluations.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Evaluasi dengan ID ${id} tidak ditemukan`);
    }

    await this.prisma.evaluations.delete({
      where: { id },
    });
    return { message: 'Evaluasi berhasil dihapus' };
  }

  async calculateStatus(
    evaluationId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<'PASS' | 'FAIL' | 'INCOMPLETE'> {
    const evaluation = await db.evaluations.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        evaluation_details: {
          select: { isRequired: true, actualValue: true, result: true },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluasi dengan ID ${evaluationId} tidak ditemukan`);
    }

    return calculateFinalStatus(evaluation.evaluation_details);
  }

  private assertCanAccess(user: AuthUser, evaluatorId: string): void {
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      return;
    }

    if (evaluatorId !== user.userId) {
      throw new ForbiddenException('Evaluasi ini bukan milik Anda');
    }
  }
}