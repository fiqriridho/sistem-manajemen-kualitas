import { BadRequestException } from '@nestjs/common';

export type CriterionMethod = 'RATING' | 'NUMERIC' | 'PASS_FAIL';

export interface RatingStandard {
  minimum: number;
}

export interface NumericStandard {
  minimum?: number;
  maximum?: number;
}

export type PassFailStandard = Record<string, never>;

export type ParsedQualityStandard = RatingStandard | NumericStandard | PassFailStandard;

export interface QualityStandardPatch {
  method?: CriterionMethod;
  standard?: unknown;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function rejectUnknownKeys(
  standard: object,
  allowed: readonly string[],
  method: CriterionMethod,
): void {
  const unknownKey = Object.keys(standard).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new BadRequestException(`Standard ${method} tidak mengenal field "${unknownKey}"`);
  }
}

export function parseQualityStandard(method: 'RATING', standard: unknown): RatingStandard;
export function parseQualityStandard(method: 'NUMERIC', standard: unknown): NumericStandard;
export function parseQualityStandard(method: 'PASS_FAIL', standard: unknown): PassFailStandard;
export function parseQualityStandard(
  method: CriterionMethod,
  standard: unknown,
): ParsedQualityStandard;
export function parseQualityStandard(
  method: CriterionMethod,
  standard: unknown,
): ParsedQualityStandard {
  if (typeof standard !== 'object' || standard === null || Array.isArray(standard)) {
    throw new BadRequestException('Standard kriteria harus berupa objek');
  }

  switch (method) {
    case 'RATING': {
      rejectUnknownKeys(standard, ['minimum'], method);
      const minimum = 'minimum' in standard ? standard.minimum : undefined;
      if (typeof minimum !== 'number' || !Number.isInteger(minimum) || minimum < 1 || minimum > 5) {
        throw new BadRequestException('Minimum RATING harus integer 1-5');
      }
      return { minimum };
    }
    case 'NUMERIC': {
      rejectUnknownKeys(standard, ['minimum', 'maximum'], method);
      const minimum = 'minimum' in standard ? standard.minimum : undefined;
      const maximum = 'maximum' in standard ? standard.maximum : undefined;

      if (minimum === undefined && maximum === undefined) {
        throw new BadRequestException('Standard NUMERIC harus memiliki minimum atau maximum');
      }
      if (minimum !== undefined && !isFiniteNumber(minimum)) {
        throw new BadRequestException('Minimum NUMERIC harus berupa angka');
      }
      if (maximum !== undefined && !isFiniteNumber(maximum)) {
        throw new BadRequestException('Maximum NUMERIC harus berupa angka');
      }
      if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
        throw new BadRequestException('Minimum NUMERIC tidak boleh lebih besar dari maximum');
      }

      const parsed: NumericStandard = {};
      if (minimum !== undefined) {
        parsed.minimum = minimum;
      }
      if (maximum !== undefined) {
        parsed.maximum = maximum;
      }
      return parsed;
    }
    case 'PASS_FAIL': {
      rejectUnknownKeys(standard, [], method);
      return {};
    }
    default:
      throw new BadRequestException('Metode kriteria tidak dikenal');
  }
}

export function resolveQualityStandard(
  currentMethod: CriterionMethod,
  currentStandard: unknown,
  patch: QualityStandardPatch,
): { method: CriterionMethod; standard: ParsedQualityStandard } {
  const method = patch.method ?? currentMethod;
  const standard = patch.standard !== undefined ? patch.standard : currentStandard;
  return { method, standard: parseQualityStandard(method, standard) };
}