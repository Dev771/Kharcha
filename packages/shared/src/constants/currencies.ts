export const CURRENCIES = {
  INR: { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee', subunit: 'paise', factor: 100 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', subunit: 'cents', factor: 100 },
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', subunit: 'cents', factor: 100 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', subunit: 'pence', factor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const DEFAULT_CURRENCY: CurrencyCode = 'INR';
