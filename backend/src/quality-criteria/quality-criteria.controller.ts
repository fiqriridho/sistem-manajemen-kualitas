import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { QualityCriteriaService } from './quality-criteria.service.js';
import { CreateQualityCriteriaDto } from './dto/create-quality-criteria.dto.js';
import { QualityCriteriaQueryDto } from './dto/quality-criteria-query.dto.js';
import { UpdateQualityCriteriaDto } from './dto/update-quality-criteria.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
@Controller('quality-criteria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QualityCriteriaController {
  constructor(private readonly service: QualityCriteriaService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createDto: CreateQualityCriteriaDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(@Query() query: QualityCriteriaQueryDto) {
    return this.service.findAll(query.productId);
  }

  @Get('active')
  findActive(@Query() query: QualityCriteriaQueryDto) {
    return this.service.findActive(query.productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateDto: UpdateQualityCriteriaDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
