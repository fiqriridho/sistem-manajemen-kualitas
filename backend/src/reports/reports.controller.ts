import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { EvaluationHistoryQueryDto } from './dto/evaluation-history-query.dto.js';
import { PaginatedEvaluationHistoryResponseDto } from './dto/evaluation-history-response.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('reports/evaluations')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('history')
  async getEvaluationHistory(
    @Query() query: EvaluationHistoryQueryDto,
  ): Promise<PaginatedEvaluationHistoryResponseDto> {
    return this.reportsService.getEvaluationHistory(query);
  }
}
