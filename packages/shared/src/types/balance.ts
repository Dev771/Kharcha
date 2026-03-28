export interface PairwiseBalance {
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amountInPaise: number;
}

export interface BalanceResponse {
  groupId: string;
  balances: PairwiseBalance[];
  updatedAt: string;
}

export interface SimplifiedSettlement {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amountInPaise: number;
}

export interface SimplifiedBalanceResponse {
  groupId: string;
  settlements: SimplifiedSettlement[];
  originalTransactionCount: number;
  simplifiedTransactionCount: number;
}

export interface NetBalance {
  userId: string;
  netInPaise: number; // positive = owed money (creditor), negative = owes money (debtor)
}
