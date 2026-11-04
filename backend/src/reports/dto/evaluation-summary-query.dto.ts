import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class EvaluationSummaryQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
