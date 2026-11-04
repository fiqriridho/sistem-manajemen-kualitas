import { IsOptional, IsUUID } from 'class-validator';

export class QualityCriteriaQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
