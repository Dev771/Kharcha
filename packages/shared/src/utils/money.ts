/**
 * Money utilities for Kharcha.
 *
 * ALL monetary values are stored as integers in the smallest currency unit:
 *   - INR: paise (1 rupee = 100 paise)
 *   - USD: cents (1 dollar = 100 cents)
 *
 * This eliminates floating-point precision issues in split calculations.
 * The display layer converts back to human-readable amounts.
 */

/**
 * Convert a human-readable amount to paise/cents.
 * e.g., 100.10 -> 10010
 */
export const toPaise = (amount: number): number => Math.round(amount * 100);

/**
 * Convert paise/cents to a human-readable amount.
 * e.g., 10010 -> 100.10
 */
export const toDisplay = (paise: number): number => paise / 100;

/**
 * Format paise as INR currency string.
 * e.g., 150000 -> "₹1,500.00"
 */
export const formatINR = (paise: number): string => {
  const amount = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format paise as a currency string for any supported currency.
 * e.g., formatCurrency(150000, 'USD') -> "$1,500.00"
 */
export const formatCurrency = (paise: number, currencyCode: string = 'INR'): string => {
  const amount = paise / 100;
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Check if a value is a valid paise amount (positive integer).
 */
export const isValidPaise = (value: number): boolean =>
  Number.isInteger(value) && value > 0;
