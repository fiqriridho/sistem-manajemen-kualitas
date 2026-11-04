import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service.js';
import { CreateEvaluationDto } from './dto/create-evaluation.dto.js';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @Roles('EVALUATOR')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEvaluationDto) {
    return this.evaluationsService.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    return this.evaluationsService.findAll(user, { productId, status });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.evaluationsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles('EVALUATOR')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationDto,
  ) {
    return this.evaluationsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.evaluationsService.remove(id);
  }

  @Get(':id/status')
  getStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.evaluationsService.getStatus(user, id);
  }
}