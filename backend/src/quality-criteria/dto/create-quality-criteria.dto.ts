import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Prisma, quality_criteria_method } from '@prisma/client';

export class CreateQualityCriteriaDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(quality_criteria_method)
  @IsNotEmpty()
  method: quality_criteria_method;

  @IsObject()
  @IsNotEmpty()
  standard: Prisma.InputJsonValue;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}