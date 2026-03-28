import { describe, it, expect } from 'vitest';
import { toPaise, toDisplay, formatINR, formatCurrency, isValidPaise } from './money';

describe('toPaise', () => {
  it('converts whole rupees', () => {
    expect(toPaise(100)).toBe(10000);
  });

  it('converts rupees with paise', () => {
    expect(toPaise(100.1)).toBe(10010);
  });

  it('converts zero', () => {
    expect(toPaise(0)).toBe(0);
  });

  it('converts smallest unit', () => {
    expect(toPaise(0.01)).toBe(1);
  });

  it('rounds correctly for floating point edge cases', () => {
    // 19.99 * 100 = 1998.9999... in floating point
    expect(toPaise(19.99)).toBe(1999);
  });

  it('handles large amounts', () => {
    expect(toPaise(999999.99)).toBe(99999999);
  });
});

describe('toDisplay', () => {
  it('converts paise to rupees', () => {
    expect(toDisplay(10010)).toBe(100.1);
  });

  it('converts zero', () => {
    expect(toDisplay(0)).toBe(0);
  });

  it('converts single paisa', () => {
    expect(toDisplay(1)).toBe(0.01);
  });
});

describe('formatINR', () => {
  it('formats with Indian comma grouping', () => {
    const result = formatINR(150000);
    expect(result).toContain('1,500');
    expect(result).toContain('\u20B9');
  });

  it('formats small amounts', () => {
    const result = formatINR(100);
    expect(result).toContain('1.00');
  });

  it('formats zero', () => {
    const result = formatINR(0);
    expect(result).toContain('0.00');
  });
});

describe('formatCurrency', () => {
  it('formats USD', () => {
    const result = formatCurrency(150000, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1,500.00');
  });

  it('defaults to INR', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('\u20B9');
  });
});

describe('isValidPaise', () => {
  it('accepts positive integers', () => {
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(1)).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidPaise(0)).toBe(false);
  });

  it('rejects negative', () => {
    expect(isValidPaise(-100)).toBe(false);
  });

  it('rejects floats', () => {
    expect(isValidPaise(10.5)).toBe(false);
  });
});
