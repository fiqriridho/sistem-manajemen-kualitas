import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  parseQualityStandard,
  type CriterionMethod,
} from '../common/quality-standard.js';

export type CriteriaResult = 'PASS' | 'FAIL';
export type EvaluationStatus = 'PASS' | 'FAIL' | 'INCOMPLETE';

export interface ParsedCriterionInput {
  value: Prisma.InputJsonValue;
  result: CriteriaResult;
}

export interface StatusDetail {
  isRequired: boolean;
  actualValue: unknown;
  result: string;
}

export function parseActualValue(
  method: CriterionMethod,
  standard: unknown,
  actualValue: unknown,
): ParsedCriterionInput {
  if (actualValue === null || actualValue === undefined) {
    throw new BadRequestException('Nilai kriteria wajib diisi');
  }

  switch (method) {
    case 'RATING': {
      const parsedStandard = parseQualityStandard('RATING', standard);
      if (
        typeof actualValue !== 'number' ||
        !Number.isInteger(actualValue) ||
        actualValue < 1 ||
        actualValue > 5
      ) {
        throw new BadRequestException('Nilai RATING harus integer 1-5');
      }
      return {
        value: actualValue,
        result: actualValue >= parsedStandard.minimum ? 'PASS' : 'FAIL',
      };
    }
    case 'NUMERIC': {
      const parsedStandard = parseQualityStandard('NUMERIC', standard);
      if (typeof actualValue !== 'number' || !Number.isFinite(actualValue)) {
        throw new BadRequestException('Nilai NUMERIC harus berupa angka');
      }
      const belowMinimum =
        parsedStandard.minimum !== undefined && actualValue < parsedStandard.minimum;
      const aboveMaximum =
        parsedStandard.maximum !== undefined && actualValue > parsedStandard.maximum;
      return {
        value: actualValue,
        result: belowMinimum || aboveMaximum ? 'FAIL' : 'PASS',
      };
    }
    case 'PASS_FAIL': {
      parseQualityStandard('PASS_FAIL', standard);
      if (actualValue !== 'PASS' && actualValue !== 'FAIL') {
        throw new BadRequestException('Nilai PASS_FAIL harus "PASS" atau "FAIL"');
      }
      return { value: actualValue, result: actualValue };
    }
    default:
      throw new BadRequestException('Metode kriteria tidak dikenal');
  }
}

export function calculateCriterionResult(
  method: CriterionMethod,
  standard: unknown,
  actualValue: unknown,
): CriteriaResult {
  return parseActualValue(method, standard, actualValue).result;
}

export function calculateFinalStatus(details: readonly StatusDetail[]): EvaluationStatus {
  if (details.length === 0) {
    return 'INCOMPLETE';
  }

  const hasIncompleteDetail = details.some(
    (detail) =>
      detail.actualValue === null ||
      detail.actualValue === undefined ||
      (detail.result !== 'PASS' && detail.result !== 'FAIL'),
  );
  if (hasIncompleteDetail) {
    return 'INCOMPLETE';
  }

  const requiredDetails = details.filter((detail) => detail.isRequired);
  if (requiredDetails.some((detail) => detail.result === 'FAIL')) {
    return 'FAIL';
  }

  return 'PASS';
}