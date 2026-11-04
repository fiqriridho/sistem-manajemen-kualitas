import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { EvaluationHistoryQueryDto } from './dto/evaluation-history-query.dto.js';
import { PaginatedEvaluationHistoryResponseDto } from './dto/evaluation-history-response.dto.js';
import { EvaluationSummaryQueryDto } from './dto/evaluation-summary-query.dto.js';
import { EvaluationSummaryResponseDto } from './dto/evaluation-summary-response.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports/evaluations')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('history')
  @Roles('ADMIN', 'SUPERVISOR')
  async getEvaluationHistory(
    @Query() query: EvaluationHistoryQueryDto,
  ): Promise<PaginatedEvaluationHistoryResponseDto> {
    return this.reportsService.getEvaluationHistory(query);
  }

  @Get('summary')
  @Roles('ADMIN', 'SUPERVISOR')
  async getEvaluationSummary(
    @Query() query: EvaluationSummaryQueryDto,
  ): Promise<EvaluationSummaryResponseDto> {
    return this.reportsService.getEvaluationSummary(query);
  }
}
