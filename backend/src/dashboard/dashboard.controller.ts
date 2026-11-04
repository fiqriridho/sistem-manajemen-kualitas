import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(): DashboardStatsDto {
    return this.dashboardService.getStats();
  }
}
