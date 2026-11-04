import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, evaluations_status } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { CreateEvaluationDto } from './dto/create-evaluation.dto.js';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto.js';

type CriteriaResult = 'PASS' | 'FAIL' | 'SKIPPED';

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

    const evaluation = await this.prisma.evaluations.create({
      data: {
        productId: product.id,
        evaluatorId: user.userId,
        evaluation_details: {
          create: product.quality_criteria.map((qc) => ({
            quality_criteria: { connect: { id: qc.id } },
            criteriaName: qc.name,
            method: qc.method,
            standardSnapshot: qc.standard as Prisma.InputJsonValue,
            result: 'SKIPPED',
          })),
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
      select: { id: true, evaluatorId: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException(`Evaluasi dengan ID ${id} tidak ditemukan`);
    }
    this.assertCanAccess(user, existing.evaluatorId);

    const detailIds = data.details.map((detail) => detail.id);
    if (new Set(detailIds).size !== detailIds.length) {
      throw new BadRequestException('Detail evaluasi duplikat');
    }

    const ownedDetails = await this.prisma.evaluation_details.findMany({
      where: { id: { in: detailIds }, evaluationId: id },
      select: { id: true },
    });
    if (ownedDetails.length !== detailIds.length) {
      throw new BadRequestException('Detail evaluasi tidak valid');
    }

    await this.prisma.$transaction(async (tx) => {
      if (data.status && data.status !== existing.status) {
        await tx.evaluations.update({
          where: { id },
          data: { status: data.status },
        });
      }

      for (const detail of data.details) {
        const updated = await tx.evaluation_details.updateMany({
          where: { id: detail.id, evaluationId: id },
          data: {
            actualValue: detail.actualValue,
            result: detail.result,
          },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Detail evaluasi tidak valid');
        }
      }

      const status = await this.calculateStatus(id, tx);
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
      include: { evaluation_details: { include: { quality_criteria: true } } },
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluasi dengan ID ${evaluationId} tidak ditemukan`);
    }

    const requiredDetails = evaluation.evaluation_details.filter((detail) => {
      const criteria = detail.quality_criteria;
      return criteria?.isRequired ?? true;
    });

    if (requiredDetails.length === 0) {
      return 'INCOMPLETE';
    }

    const hasFail = requiredDetails.some((detail) => detail.result === 'FAIL');
    if (hasFail) {
      return 'FAIL';
    }

    const allPass = requiredDetails.every((detail) => detail.result === 'PASS');
    if (allPass) {
      return 'PASS';
    }

    return 'INCOMPLETE';
  }

  calculateCriterionResult(
    method: 'RATING' | 'NUMERIC' | 'PASS_FAIL',
    standard: any,
    actualValue: any,
  ): CriteriaResult {
    if (actualValue === null || actualValue === undefined) {
      return 'SKIPPED';
    }

    if (method === 'RATING') {
      const minRating = standard?.min ?? 1;
      const rating = Number(actualValue);
      return rating >= minRating ? 'PASS' : 'FAIL';
    }

    if (method === 'NUMERIC') {
      const min = standard?.min;
      const max = standard?.max;
      const value = Number(actualValue);

      if (min !== undefined && max !== undefined) {
        return value >= min && value <= max ? 'PASS' : 'FAIL';
      }
      if (min !== undefined && value >= min) {
        return 'PASS';
      }
      if (max !== undefined && value <= max) {
        return 'PASS';
      }
      return 'FAIL';
    }

    if (method === 'PASS_FAIL') {
      return actualValue === true ? 'PASS' : 'FAIL';
    }

    return 'SKIPPED';
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