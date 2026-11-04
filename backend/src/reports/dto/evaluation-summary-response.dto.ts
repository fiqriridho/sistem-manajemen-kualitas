export class EvaluationSummaryResponseDto {
  totalEvaluations: number;
  byStatus: {
    PASS: number;
    FAIL: number;
    INCOMPLETE: number;
  };
}
