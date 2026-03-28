import { describe, it, expect } from 'vitest';
import { calculateSplit, SplitResult } from './split';

/** Helper: assert splits sum exactly to total */
function assertZeroSum(result: SplitResult, total: number) {
  const sum = result.reduce((s, r) => s + r.owedInPaise, 0);
  expect(sum).toBe(total);
}

describe('calculateSplit', () => {
  // ─── EQUAL ───

  describe('EQUAL', () => {
    it('splits evenly with no remainder', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'EQUAL',
        participants: [{ userId: 'a' }, { userId: 'b' }],
      });
      expect(result).toEqual([
        { userId: 'a', owedInPaise: 5000 },
        { userId: 'b', owedInPaise: 5000 },
      ]);
      assertZeroSum(result, 10000);
    });

    it('distributes remainder to first participants', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'EQUAL',
        participants: [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }],
      });
      // 10000 / 3 = 3333 remainder 1
      expect(result[0].owedInPaise).toBe(3334);
      expect(result[1].owedInPaise).toBe(3333);
      expect(result[2].owedInPaise).toBe(3333);
      assertZeroSum(result, 10000);
    });

    it('handles large remainder (7 people, 100 paise)', () => {
      const result = calculateSplit({
        totalInPaise: 100,
        splitType: 'EQUAL',
        participants: Array.from({ length: 7 }, (_, i) => ({ userId: `u${i}` })),
      });
      // 100 / 7 = 14 remainder 2 -> first 2 get 15, rest get 14
      assertZeroSum(result, 100);
      expect(result.filter((r) => r.owedInPaise === 15).length).toBe(2);
      expect(result.filter((r) => r.owedInPaise === 14).length).toBe(5);
    });

    it('handles single participant', () => {
      const result = calculateSplit({
        totalInPaise: 5000,
        splitType: 'EQUAL',
        participants: [{ userId: 'solo' }],
      });
      expect(result).toEqual([{ userId: 'solo', owedInPaise: 5000 }]);
    });
  });

  // ─── EXACT ───

  describe('EXACT', () => {
    it('accepts correct exact amounts', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'EXACT',
        participants: [
          { userId: 'a', value: 5000 },
          { userId: 'b', value: 3000 },
          { userId: 'c', value: 2000 },
        ],
      });
      assertZeroSum(result, 10000);
      expect(result[0].owedInPaise).toBe(5000);
      expect(result[1].owedInPaise).toBe(3000);
      expect(result[2].owedInPaise).toBe(2000);
    });

    it('throws if exact amounts do not sum to total', () => {
      expect(() =>
        calculateSplit({
          totalInPaise: 10000,
          splitType: 'EXACT',
          participants: [
            { userId: 'a', value: 5000 },
            { userId: 'b', value: 3000 },
          ],
        }),
      ).toThrow('does not equal total');
    });

    it('throws if exact amounts exceed total', () => {
      expect(() =>
        calculateSplit({
          totalInPaise: 10000,
          splitType: 'EXACT',
          participants: [
            { userId: 'a', value: 7000 },
            { userId: 'b', value: 5000 },
          ],
        }),
      ).toThrow('does not equal total');
    });
  });

  // ─── PERCENTAGE ───

  describe('PERCENTAGE', () => {
    it('splits by percentage', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'PERCENTAGE',
        participants: [
          { userId: 'a', value: 50 },
          { userId: 'b', value: 30 },
          { userId: 'c', value: 20 },
        ],
      });
      expect(result[0].owedInPaise).toBe(5000);
      expect(result[1].owedInPaise).toBe(3000);
      expect(result[2].owedInPaise).toBe(2000);
      assertZeroSum(result, 10000);
    });

    it('handles rounding with odd percentages', () => {
      const result = calculateSplit({
        totalInPaise: 10001,
        splitType: 'PERCENTAGE',
        participants: [
          { userId: 'a', value: 33.33 },
          { userId: 'b', value: 33.33 },
          { userId: 'c', value: 33.34 },
        ],
      });
      // Regardless of rounding method, sum must be exact
      assertZeroSum(result, 10001);
    });

    it('throws if percentages do not sum to 100', () => {
      expect(() =>
        calculateSplit({
          totalInPaise: 10000,
          splitType: 'PERCENTAGE',
          participants: [
            { userId: 'a', value: 50 },
            { userId: 'b', value: 30 },
          ],
        }),
      ).toThrow('must sum to 100');
    });
  });

  // ─── SHARES ───

  describe('SHARES', () => {
    it('splits by shares 2:1:1', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'SHARES',
        participants: [
          { userId: 'a', value: 2 },
          { userId: 'b', value: 1 },
          { userId: 'c', value: 1 },
        ],
      });
      expect(result[0].owedInPaise).toBe(5000);
      expect(result[1].owedInPaise).toBe(2500);
      expect(result[2].owedInPaise).toBe(2500);
      assertZeroSum(result, 10000);
    });

    it('defaults share value to 1 when omitted', () => {
      const result = calculateSplit({
        totalInPaise: 9000,
        splitType: 'SHARES',
        participants: [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }],
      });
      // Behaves like EQUAL
      expect(result[0].owedInPaise).toBe(3000);
      expect(result[1].owedInPaise).toBe(3000);
      expect(result[2].owedInPaise).toBe(3000);
      assertZeroSum(result, 9000);
    });

    it('handles rounding with odd shares', () => {
      const result = calculateSplit({
        totalInPaise: 10001,
        splitType: 'SHARES',
        participants: [
          { userId: 'a', value: 2 },
          { userId: 'b', value: 1 },
          { userId: 'c', value: 1 },
        ],
      });
      assertZeroSum(result, 10001);
    });

    it('handles large share ratios', () => {
      const result = calculateSplit({
        totalInPaise: 100000,
        splitType: 'SHARES',
        participants: [
          { userId: 'a', value: 10 },
          { userId: 'b', value: 3 },
          { userId: 'c', value: 1 },
        ],
      });
      assertZeroSum(result, 100000);
      // a should get ~71.4%, b ~21.4%, c ~7.1%
      expect(result[0].owedInPaise).toBeGreaterThan(result[1].owedInPaise);
      expect(result[1].owedInPaise).toBeGreaterThan(result[2].owedInPaise);
    });
  });

  // ─── Error cases ───

  describe('error handling', () => {
    it('throws for zero participants', () => {
      expect(() =>
        calculateSplit({ totalInPaise: 10000, splitType: 'EQUAL', participants: [] }),
      ).toThrow('At least one participant');
    });

    it('throws for negative total', () => {
      expect(() =>
        calculateSplit({
          totalInPaise: -100,
          splitType: 'EQUAL',
          participants: [{ userId: 'a' }],
        }),
      ).toThrow('must be positive');
    });

    it('throws for non-integer total', () => {
      expect(() =>
        calculateSplit({
          totalInPaise: 100.5,
          splitType: 'EQUAL',
          participants: [{ userId: 'a' }],
        }),
      ).toThrow('must be an integer');
    });
  });
});
