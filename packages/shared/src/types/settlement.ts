export interface CreateSettlementRequest {
  paidById: string;
  paidToId: string;
  amountInPaise: number;
  note?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  paidById: string;
  paidByName?: string;
  paidToId: string;
  paidToName?: string;
  amountInPaise: number;
  note: string | null;
  createdAt: string;
}
