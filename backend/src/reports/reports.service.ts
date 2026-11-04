import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { EvaluationHistoryQueryDto } from './dto/evaluation-history-query.dto.js';
import { EvaluationHistoryResponseDto, PaginatedEvaluationHistoryResponseDto } from './dto/evaluation-history-response.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvaluationHistory(
    query: EvaluationHistoryQueryDto,
  ): Promise<PaginatedEvaluationHistoryResponseDto> {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.evaluatorId) {
      where.evaluatorId = query.evaluatorId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.evaluatedAt = {};
      if (query.startDate) {
        where.evaluatedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.evaluatedAt.lte = new Date(query.endDate);
      }
    }

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
}
