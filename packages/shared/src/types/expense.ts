export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface SplitEntry {
  userId: string;
  value?: number; // paise (EXACT), percentage (PERCENTAGE), share ratio (SHARES). Omit for EQUAL.
}

export interface CreateExpenseRequest {
  amountInPaise: number;
  currency?: string;
  description: string;
  category?: string;
  tags?: string[];
  splitType: SplitType;
  date: string; // YYYY-MM-DD
  paidById: string;
  splits: SplitEntry[];
  idempotencyKey?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface ExpenseSplitResponse {
  id: string;
  userId: string;
  userName?: string;
  owedAmountInPaise: number;
  shareValue: number | null;
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  paidByName?: string;
  amountInPaise: number;
  currency: string;
  description: string;
  category: string | null;
  tags: string[];
  splitType: SplitType;
  date: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: string;
  splits?: ExpenseSplitResponse[];
}

export interface ExpenseFilterParams {
  category?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  paidBy?: string;
  splitWith?: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
  sort?: string; // e.g. "date:desc"
}
