export const SPLIT_TYPES = {
  EQUAL: {
    value: 'EQUAL' as const,
    label: 'Split equally',
    description: 'Everyone pays the same amount',
  },
  EXACT: {
    value: 'EXACT' as const,
    label: 'Exact amounts',
    description: 'Specify exact amount for each person (in paise)',
  },
  PERCENTAGE: {
    value: 'PERCENTAGE' as const,
    label: 'By percentage',
    description: 'Specify percentage for each person (must total 100)',
  },
  SHARES: {
    value: 'SHARES' as const,
    label: 'By shares',
    description: 'Specify share ratio (e.g., 2:1:1)',
  },
} as const;

export type SplitTypeKey = keyof typeof SPLIT_TYPES;
