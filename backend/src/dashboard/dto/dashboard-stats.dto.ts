export class DashboardStatsDto {
  totalProducts: number;
  totalEvaluations: number;
  productsByQualityStatus: {
    PASS: number;
    FAIL: number;
    INCOMPLETE: number;
    UNEVALUATED: number;
  };
  evaluationsByStatus: {
    PASS: number;
    FAIL: number;
    INCOMPLETE: number;
  };
  recentEvaluations: number;
}
