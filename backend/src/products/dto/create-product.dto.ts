import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { products_status } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsEnum(products_status)
  status?: products_status;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
