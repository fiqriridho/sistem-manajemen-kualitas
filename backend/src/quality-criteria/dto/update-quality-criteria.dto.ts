import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { quality_criteria_method } from '@prisma/client';

export class UpdateQualityCriteriaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(quality_criteria_method)
  @IsOptional()
  method?: quality_criteria_method;

  @IsObject()
  @IsOptional()
  standard?: unknown;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}