import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EvaluationDetailDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsDefined()
  actualValue: unknown;
}

export class UpdateEvaluationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => EvaluationDetailDto)
  details: EvaluationDetailDto[];
}