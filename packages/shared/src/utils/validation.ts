export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidCurrencyCode = (code: string): boolean => /^[A-Z]{3}$/.test(code);

export const isPositiveInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;
