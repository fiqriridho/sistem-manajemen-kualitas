import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class EvaluationDetailDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  evaluationDetailId: string;

  @IsNotEmpty()
  actualValue: any;

  @IsOptional()
  @IsEnum(['PASS', 'FAIL'])
  result?: 'PASS' | 'FAIL';
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsEnum(['PASS', 'FAIL', 'INCOMPLETE'])
  status?: 'PASS' | 'FAIL' | 'INCOMPLETE';

  @IsArray()
  @IsNotEmpty()
  details: EvaluationDetailDto[];
}
