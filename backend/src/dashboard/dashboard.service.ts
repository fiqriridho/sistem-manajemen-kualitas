import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [totalProducts, totalEvaluations, products] = await Promise.all([
      this.prisma.products.count(),
      this.prisma.evaluations.count(),
      this.prisma.products.findMany({
        include: {
          evaluations: {
            orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
            take: 1,
          },
        },
      }),
    ]);
    const evaluationsByStatusGroup = await this.prisma.evaluations.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const now = new Date();
    const recentSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentEvaluations = await this.prisma.evaluations.count({
      where: { evaluatedAt: { gte: recentSince } },
    });

    const productsByQualityStatus: {
      PASS: number;
      FAIL: number;
      INCOMPLETE: number;
      UNEVALUATED: number;
    } = {
      PASS: 0,
      FAIL: 0,
      INCOMPLETE: 0,
      UNEVALUATED: 0,
    };

    for (const product of products) {
      const latest = product.evaluations[0];
      if (!latest) {
        productsByQualityStatus.UNEVALUATED += 1;
        continue;
      }
      if (latest.status === 'PASS') {
        productsByQualityStatus.PASS += 1;
      } else if (latest.status === 'FAIL') {
        productsByQualityStatus.FAIL += 1;
      } else if (latest.status === 'INCOMPLETE') {
        productsByQualityStatus.INCOMPLETE += 1;
      }
    }

    const evaluationsByStatus = {
      PASS: 0,
      FAIL: 0,
      INCOMPLETE: 0,
    };
    for (const group of evaluationsByStatusGroup) {
      const count = Number(group._count._all);
      evaluationsByStatus[group.status as keyof typeof evaluationsByStatus] += count;
    }

    return {
      totalProducts,
      totalEvaluations,
      productsByQualityStatus,
      evaluationsByStatus,
      recentEvaluations,
    };
  }
}
