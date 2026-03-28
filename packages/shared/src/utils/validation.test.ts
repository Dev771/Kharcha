import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidCurrencyCode, isPositiveInteger } from './validation';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
  });
});

describe('isValidCurrencyCode', () => {
  it('accepts 3-letter uppercase codes', () => {
    expect(isValidCurrencyCode('INR')).toBe(true);
    expect(isValidCurrencyCode('USD')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidCurrencyCode('inr')).toBe(false);
    expect(isValidCurrencyCode('US')).toBe(false);
    expect(isValidCurrencyCode('USDD')).toBe(false);
  });
});

describe('isPositiveInteger', () => {
  it('accepts positive integers', () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(1000)).toBe(true);
  });

  it('rejects zero, negatives, and floats', () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
  });
});
