import { Module } from '@nestjs/common';
import { QualityCriteriaService } from './quality-criteria.service.js';
import { QualityCriteriaController } from './quality-criteria.controller.js';
import { CommonModule } from '../common/common.module.js';

@Module({
  imports: [CommonModule],
  controllers: [QualityCriteriaController],
  providers: [QualityCriteriaService],
})
export class QualityCriteriaModule {}
