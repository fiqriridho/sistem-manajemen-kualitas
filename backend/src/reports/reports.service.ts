import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import { EvaluationHistoryQueryDto } from './dto/evaluation-history-query.dto.js';
import {
  EvaluationHistoryResponseDto,
  PaginatedEvaluationHistoryResponseDto,
} from './dto/evaluation-history-response.dto.js';
import { EvaluationSummaryQueryDto } from './dto/evaluation-summary-query.dto.js';
import { EvaluationSummaryResponseDto } from './dto/evaluation-summary-response.dto.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function startOfDay(value: Date): Date {
  const date = new Date(value.getTime());
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date): Date {
  const date = new Date(value.getTime());
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvaluationHistory(
    query: EvaluationHistoryQueryDto,
  ): Promise<PaginatedEvaluationHistoryResponseDto> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where = this.buildEvaluationWhere(query);

    const [totalItems, evaluations] = await Promise.all([
      this.prisma.evaluations.count({ where }),
      this.prisma.evaluations.findMany({
        where,
        include: {
          products: {
            include: {
              categories: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          evaluation_details: true,
        },
        orderBy: { evaluatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data: EvaluationHistoryResponseDto[] = evaluations.map((evaluation) => {
      const criteriaScores = evaluation.evaluation_details.map((detail) => ({
        criteriaId: detail.criteriaId,
        criteriaName: detail.criteriaName,
        score: typeof detail.actualValue === 'number' ? detail.actualValue : null,
      }));
      const scores = criteriaScores
        .map((criterion) => criterion.score)
        .filter((score): score is number => score !== null);

      return {
        id: evaluation.id,
        evaluationDate: evaluation.evaluatedAt.toISOString(),
        totalScore: scores.length
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null,
        status: evaluation.status,
        product: {
          id: evaluation.products.id,
          name: evaluation.products.name,
          category: {
            id: evaluation.products.categories.id,
            name: evaluation.products.categories.name,
          },
        },
        evaluator: {
          id: evaluation.users.id,
          name: evaluation.users.name,
          email: evaluation.users.email,
        },
        criteriaScores,
        createdAt: evaluation.createdAt.toISOString(),
        updatedAt: evaluation.updatedAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async getEvaluationSummary(
    query: EvaluationSummaryQueryDto,
  ): Promise<EvaluationSummaryResponseDto> {
    const where = this.buildEvaluationWhere(query);

    const groups = await this.prisma.evaluations.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const byStatus: { PASS: number; FAIL: number; INCOMPLETE: number } = {
      PASS: 0,
      FAIL: 0,
      INCOMPLETE: 0,
    };
    let totalEvaluations = 0;

    for (const group of groups) {
      const count = Number(group._count._all);
      byStatus[group.status as keyof typeof byStatus] += count;
      totalEvaluations += count;
    }

    return { totalEvaluations, byStatus };
  }

  private buildEvaluationWhere(
    query:
      | EvaluationHistoryQueryDto
      | EvaluationSummaryQueryDto,
  ): Prisma.evaluationsWhereInput {
    const where: Prisma.evaluationsWhereInput = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.categoryId) {
      where.products = { categoryId: query.categoryId };
    }

    if ('evaluatorId' in query && query.evaluatorId) {
      where.evaluatorId = query.evaluatorId;
    }

    if ('status' in query && query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      let startDate = query.startDate
        ? this.parseDate(query.startDate, 'startDate')
        : undefined;
      let endDate = query.endDate
        ? this.parseDate(query.endDate, 'endDate')
        : undefined;

      if (startDate && DATE_ONLY_RE.test(query.startDate ?? '')) {
        startDate = startOfDay(startDate);
      }
      if (endDate && DATE_ONLY_RE.test(query.endDate ?? '')) {
        endDate = endOfDay(endDate);
      }

      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('startDate harus sebelum atau sama dengan endDate');
      }

      where.evaluatedAt = {};
      if (startDate) {
        where.evaluatedAt.gte = startDate;
      }
      if (endDate) {
        where.evaluatedAt.lte = endDate;
      }
    }

    return where;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} tidak valid`);
    }
    return date;
  }
}
