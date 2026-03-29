export interface NetBalanceEntry {
  userId: string;
  netInPaise: number;
}

export interface SimplifiedSettlementEntry {
  fromUserId: string;
  toUserId: string;
  amountInPaise: number;
}

export function simplifyDebts(
  netBalances: NetBalanceEntry[],
): SimplifiedSettlementEntry[] {
  const sum = netBalances.reduce((s, b) => s + b.netInPaise, 0);
  if (sum !== 0) {
    throw new Error(
      `Balance zero-sum invariant violated: sum = ${sum}, expected 0`,
    );
  }

  const creditors: NetBalanceEntry[] = [];
  const debtors: NetBalanceEntry[] = [];

  for (const b of netBalances) {
    if (b.netInPaise > 0) {
      creditors.push({ ...b });
    } else if (b.netInPaise < 0) {
      debtors.push({ ...b, netInPaise: Math.abs(b.netInPaise) });
    }
  }

  creditors.sort((a, b) => b.netInPaise - a.netInPaise);
  debtors.sort((a, b) => b.netInPaise - a.netInPaise);

  const settlements: SimplifiedSettlementEntry[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].netInPaise, debtors[di].netInPaise);

    if (amount > 0) {
      settlements.push({
        fromUserId: debtors[di].userId,
        toUserId: creditors[ci].userId,
        amountInPaise: amount,
      });
    }

    creditors[ci].netInPaise -= amount;
    debtors[di].netInPaise -= amount;

    if (creditors[ci].netInPaise === 0) ci++;
    if (debtors[di].netInPaise === 0) di++;
  }

  return settlements;
}
