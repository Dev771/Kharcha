export enum AppEvent {
  EXPENSE_CREATED = 'expense.created',
  EXPENSE_UPDATED = 'expense.updated',
  EXPENSE_DELETED = 'expense.deleted',
  SETTLEMENT_CREATED = 'settlement.created',
  GROUP_MEMBER_JOINED = 'group.member.joined',
}

export interface ExpenseCreatedPayload {
  groupId: string;
  expenseId: string;
  paidById: string;
  affectedUserIds: (string | null)[];
}

export interface SettlementCreatedPayload {
  groupId: string;
  settlementId: string;
  paidById: string;
  paidToId: string;
  amountInPaise: number;
}

export interface MemberJoinedPayload {
  groupId: string;
  userId: string;
  userName: string;
}
