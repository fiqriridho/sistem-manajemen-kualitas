export class EvaluationResponseDto {
  id: string;
  productId: string;
  evaluatedById: string;
  status: string;
  overallComment?: string;
  criteria: {
    criterionId: string;
    snapshotName: string;
    snapshotDescription?: string;
    snapshotPassingScore: number;
    score: number;
    comment?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}