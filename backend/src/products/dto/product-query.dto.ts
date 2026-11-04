import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { products_status } from '@prisma/client';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(products_status)
  status?: products_status;
}
