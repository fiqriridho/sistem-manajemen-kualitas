import { IsOptional, IsString } from 'class-validator';

export class UpdateQualityCriteriaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  standard?: any;

  @IsOptional()
  isRequired?: boolean;

  @IsOptional()
  isActive?: boolean;
}
