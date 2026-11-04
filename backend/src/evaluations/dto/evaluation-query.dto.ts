export class EvaluationQueryDto {
  productId?: string;
  evaluatedById?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number = 1;
  limit?: number = 20;
}