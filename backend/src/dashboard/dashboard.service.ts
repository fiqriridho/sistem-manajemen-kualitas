import { Injectable } from '@nestjs/common';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';

@Injectable()
export class DashboardService {
  getStats(): DashboardStatsDto {
    const mockStats: DashboardStatsDto = {
      totalProducts: 156,
      totalEvaluations: 423,
      avgQualityScore: 87.4,
      passingRate: 92.4,
      recentEvaluations: 38,
    };

    return mockStats;
  }
}
