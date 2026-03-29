import { simplifyDebts } from './simplify.service';

describe('simplifyDebts', () => {
  it('simplifies 2-person debt', () => {
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 1000 },
      { userId: 'B', netInPaise: -1000 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fromUserId: 'B',
      toUserId: 'A',
      amountInPaise: 1000,
    });
  });

  it('simplifies 3-person chain', () => {
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 500 },
      { userId: 'B', netInPaise: 0 },
      { userId: 'C', netInPaise: -500 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].amountInPaise).toBe(500);
  });

  it('simplifies 3-person with multiple debts', () => {
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 5000 },
      { userId: 'B', netInPaise: 2000 },
      { userId: 'C', netInPaise: -7000 },
    ]);
    expect(result.length).toBeLessThanOrEqual(2);
    const totalSettled = result.reduce((s, r) => s + r.amountInPaise, 0);
    expect(totalSettled).toBe(7000);
  });

  it('handles 10 people with random balanced amounts', () => {
    const balances = [];
    let remaining = 0;
    for (let i = 0; i < 9; i++) {
      const amount = Math.floor(Math.random() * 10000) - 5000;
      balances.push({ userId: `u${i}`, netInPaise: amount });
      remaining -= amount;
    }
    balances.push({ userId: 'u9', netInPaise: remaining });

    const result = simplifyDebts(balances);
    for (const s of result) {
      expect(s.amountInPaise).toBeGreaterThan(0);
    }
  });

  it('returns empty array for balanced group', () => {
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 0 },
      { userId: 'B', netInPaise: 0 },
    ]);
    expect(result).toEqual([]);
  });

  it('throws on zero-sum invariant violation', () => {
    expect(() =>
      simplifyDebts([
        { userId: 'A', netInPaise: 100 },
        { userId: 'B', netInPaise: -50 },
      ]),
    ).toThrow('invariant violated');
  });

  it('handles single person with zero balance', () => {
    const result = simplifyDebts([{ userId: 'A', netInPaise: 0 }]);
    expect(result).toEqual([]);
  });

  it('handles empty input', () => {
    const result = simplifyDebts([]);
    expect(result).toEqual([]);
  });
});
