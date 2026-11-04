export class EvaluationHistoryResponseDto {
  id: string;
  evaluationDate: string;
  totalScore: number | null;
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  product: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  };
  evaluator: {
    id: string;
    name: string;
  };
  criteriaScores: {
    criteriaId: string;
    criteriaName: string;
    score: number | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

export class PaginatedEvaluationHistoryResponseDto {
  data: EvaluationHistoryResponseDto[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
