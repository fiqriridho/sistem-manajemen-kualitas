import { BadRequestException } from '@nestjs/common';
import { parseQualityStandard, resolveQualityStandard } from '../common/quality-standard.js';
import {
  calculateCriterionResult,
  calculateFinalStatus,
  parseActualValue,
} from './evaluation-calculator.js';

describe('evaluation calculator', () => {
  describe('parseQualityStandard', () => {
    it('accepts RATING minimum integer 1-5 and rejects other shapes', () => {
      expect(parseQualityStandard('RATING', { minimum: 3 })).toEqual({ minimum: 3 });
      expect(parseQualityStandard('RATING', { minimum: 1 })).toEqual({ minimum: 1 });
      for (const standard of [
        { minimum: 0 },
        { minimum: 6 },
        { minimum: 2.5 },
        { minimum: '3' },
        {},
        { min: 3 },
        { minimum: 3, maximum: 5 },
      ]) {
        expect(() => parseQualityStandard('RATING', standard)).toThrow(BadRequestException);
      }
    });

    it('accepts NUMERIC with at least one finite bound', () => {
      expect(parseQualityStandard('NUMERIC', { minimum: 10 })).toEqual({ minimum: 10 });
      expect(parseQualityStandard('NUMERIC', { maximum: 20 })).toEqual({ maximum: 20 });
      expect(parseQualityStandard('NUMERIC', { minimum: 10, maximum: 20 })).toEqual({
        minimum: 10,
        maximum: 20,
      });
    });

    it('rejects invalid NUMERIC standards', () => {
      for (const standard of [
        {},
        { min: 10 },
        { minimum: '10' },
        { maximum: Number.POSITIVE_INFINITY },
        { minimum: 20, maximum: 10 },
      ]) {
        expect(() => parseQualityStandard('NUMERIC', standard)).toThrow(BadRequestException);
      }
    });

    it('accepts only an empty PASS_FAIL standard', () => {
      expect(parseQualityStandard('PASS_FAIL', {})).toEqual({});
      expect(() => parseQualityStandard('PASS_FAIL', { minimum: 3 })).toThrow(BadRequestException);
      expect(() => parseQualityStandard('PASS_FAIL', undefined)).toThrow(BadRequestException);
    });

    it('rejects unknown methods', () => {
      expect(() => parseQualityStandard('UNKNOWN' as never, {})).toThrow(BadRequestException);
    });
  });

  describe('resolveQualityStandard', () => {
    it('validates the effective pair when method changes without standard', () => {
      expect(resolveQualityStandard('RATING', { minimum: 3 }, { method: 'NUMERIC' })).toEqual({
        method: 'NUMERIC',
        standard: { minimum: 3 },
      });
      expect(() =>
        resolveQualityStandard('NUMERIC', { maximum: 20 }, { method: 'RATING' }),
      ).toThrow(BadRequestException);
      expect(() =>
        resolveQualityStandard('RATING', { minimum: 3 }, { method: 'PASS_FAIL' }),
      ).toThrow(BadRequestException);
    });

    it('uses the new standard with the effective method', () => {
      expect(
        resolveQualityStandard('RATING', { minimum: 3 }, { standard: { minimum: 4 } }),
      ).toEqual({ method: 'RATING', standard: { minimum: 4 } });
      expect(
        resolveQualityStandard('RATING', { minimum: 3 }, {
          method: 'PASS_FAIL',
          standard: {},
        }),
      ).toEqual({ method: 'PASS_FAIL', standard: {} });
    });
  });

  describe('calculateCriterionResult / parseActualValue', () => {
    it('calculates RATING boundaries', () => {
      expect(calculateCriterionResult('RATING', { minimum: 3 }, 3)).toBe('PASS');
      expect(calculateCriterionResult('RATING', { minimum: 3 }, 5)).toBe('PASS');
      expect(calculateCriterionResult('RATING', { minimum: 3 }, 2)).toBe('FAIL');
    });

    it('rejects invalid RATING values', () => {
      for (const value of [0, 6, 2.5, '4', null, true]) {
        expect(() => calculateCriterionResult('RATING', { minimum: 3 }, value)).toThrow(
          BadRequestException,
        );
      }
    });

    it('calculates NUMERIC bounds', () => {
      expect(calculateCriterionResult('NUMERIC', { minimum: 10, maximum: 20 }, 15)).toBe('PASS');
      expect(calculateCriterionResult('NUMERIC', { minimum: 10, maximum: 20 }, 10)).toBe('PASS');
      expect(calculateCriterionResult('NUMERIC', { minimum: 10, maximum: 20 }, 9)).toBe('FAIL');
      expect(calculateCriterionResult('NUMERIC', { minimum: 10, maximum: 20 }, 21)).toBe('FAIL');
      expect(calculateCriterionResult('NUMERIC', { maximum: 20 }, 25)).toBe('FAIL');
      expect(calculateCriterionResult('NUMERIC', { minimum: 10 }, 5)).toBe('FAIL');
    });

    it('rejects invalid NUMERIC values and standards', () => {
      expect(() => calculateCriterionResult('NUMERIC', { minimum: 10 }, '15')).toThrow(
        BadRequestException,
      );
      expect(() => calculateCriterionResult('NUMERIC', {}, 15)).toThrow(BadRequestException);
    });

    it('uses PASS_FAIL value directly', () => {
      const pass = parseActualValue('PASS_FAIL', {}, 'PASS');
      expect(pass).toEqual({ value: 'PASS', result: 'PASS' });
      expect(calculateCriterionResult('PASS_FAIL', {}, 'FAIL')).toBe('FAIL');
      for (const value of ['pass', true, null]) {
        expect(() => calculateCriterionResult('PASS_FAIL', {}, value)).toThrow(
          BadRequestException,
        );
      }
    });

    it('stores validated values as JSON primitives', () => {
      expect(parseActualValue('NUMERIC', { maximum: 20 }, 15).value).toBe(15);
      expect(parseActualValue('PASS_FAIL', {}, 'PASS').value).toBe('PASS');
    });
  });

  describe('calculateFinalStatus', () => {
    const detail = (isRequired: boolean, actualValue: unknown, result: string) => ({
      isRequired,
      actualValue,
      result,
    });

    it('returns INCOMPLETE when any active detail is empty', () => {
      expect(calculateFinalStatus([])).toBe('INCOMPLETE');
      expect(
        calculateFinalStatus([
          detail(true, 4, 'PASS'),
          detail(false, null, 'SKIPPED'),
        ]),
      ).toBe('INCOMPLETE');
    });

    it('ignores optional FAIL but requires optional details to be filled', () => {
      expect(
        calculateFinalStatus([
          detail(true, 4, 'PASS'),
          detail(false, 15, 'FAIL'),
        ]),
      ).toBe('PASS');
      expect(
        calculateFinalStatus([
          detail(true, 4, 'PASS'),
          detail(false, null, 'SKIPPED'),
        ]),
      ).toBe('INCOMPLETE');
    });

    it('returns FAIL when a required detail fails', () => {
      expect(
        calculateFinalStatus([
          detail(true, 2, 'FAIL'),
          detail(true, 15, 'PASS'),
        ]),
      ).toBe('FAIL');
    });

    it('returns PASS when only optional details exist', () => {
      expect(calculateFinalStatus([detail(false, 15, 'FAIL')])).toBe('PASS');
    });
  });
});