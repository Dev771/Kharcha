import type { SplitType } from '../types/expense';

export type SplitInput = {
  totalInPaise: number;
  splitType: SplitType;
  participants: { userId: string; value?: number }[];
};

export type SplitResult = {
  userId: string;
  owedInPaise: number;
}[];

/**
 * Calculate how an expense should be split among participants.
 *
 * Key invariant: the sum of all owedInPaise values MUST equal totalInPaise.
 * This is enforced by assigning rounding remainders to specific participants
 * rather than allowing floating-point drift.
 *
 * @throws Error if inputs are invalid (zero participants, negative total, etc.)
 */
export function calculateSplit(input: SplitInput): SplitResult {
  const { totalInPaise, splitType, participants } = input;

  if (participants.length === 0) {
    throw new Error('At least one participant is required');
  }
  if (totalInPaise <= 0) {
    throw new Error('Total amount must be positive');
  }
  if (!Number.isInteger(totalInPaise)) {
    throw new Error('Total amount must be an integer (paise)');
  }

  switch (splitType) {
    case 'EQUAL':
      return splitEqual(totalInPaise, participants);
    case 'EXACT':
      return splitExact(totalInPaise, participants);
    case 'PERCENTAGE':
      return splitPercentage(totalInPaise, participants);
    case 'SHARES':
      return splitByShares(totalInPaise, participants);
  }
}

/**
 * EQUAL: Divide evenly. Remainder paise go to the first N participants.
 * e.g., 10000 among 3 -> [3334, 3333, 3333]
 */
function splitEqual(
  totalInPaise: number,
  participants: { userId: string }[],
): SplitResult {
  const n = participants.length;
  const base = Math.floor(totalInPaise / n);
  const remainder = totalInPaise - base * n;

  return participants.map((p, i) => ({
    userId: p.userId,
    owedInPaise: base + (i < remainder ? 1 : 0),
  }));
}

/**
 * EXACT: Each participant's value is their exact owed amount in paise.
 * Sum of all values MUST equal the total.
 */
function splitExact(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (sum !== totalInPaise) {
    throw new Error(`Exact split sum (${sum}) does not equal total (${totalInPaise})`);
  }
  return participants.map((p) => ({
    userId: p.userId,
    owedInPaise: p.value!,
  }));
}

/**
 * PERCENTAGE: Each participant's value is their percentage (must sum to 100).
 * Rounding correction applied to last participant to maintain zero-sum.
 */
function splitPercentage(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const totalPercent = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPercent}`);
  }

  let allocated = 0;
  const results = participants.map((p) => {
    const raw = Math.round((totalInPaise * (p.value ?? 0)) / 100);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  // Rounding correction: adjust last participant so total is exact
  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}

/**
 * SHARES: Each participant's value is their share weight (e.g., 2:1:1).
 * If value is omitted, defaults to 1.
 * Rounding correction applied to last participant.
 */
function splitByShares(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const totalShares = participants.reduce((s, p) => s + (p.value ?? 1), 0);

  if (totalShares <= 0) {
    throw new Error('Total shares must be positive');
  }

  let allocated = 0;
  const results = participants.map((p) => {
    const raw = Math.round((totalInPaise * (p.value ?? 1)) / totalShares);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  // Rounding correction: adjust last participant so total is exact
  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}
