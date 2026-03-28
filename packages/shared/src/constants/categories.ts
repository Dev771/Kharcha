export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'accommodation',
  'entertainment',
  'shopping',
  'utilities',
  'rent',
  'groceries',
  'health',
  'education',
  'subscriptions',
  'travel',
  'gifts',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
