import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  simplifyDebts,
  NetBalanceEntry,
} from './simplify.service';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getGroupBalances(groupId: string) {
    const cacheKey = `balances:${groupId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache MISS for ${cacheKey}`);
    const result = await this.computeBalancesFromDB(groupId);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    return result;
  }

  async getSimplifiedBalances(groupId: string) {
    const cacheKey = `balances:simplified:${groupId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const netBalances = await this.computeNetBalances(groupId);
    const simplified = simplifyDebts(netBalances);

    const userIds = [
      ...new Set(simplified.flatMap((s) => [s.fromUserId, s.toUserId])),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const result = {
      groupId,
      settlements: simplified.map((s) => ({
        from: {
          id: s.fromUserId,
          name: userMap.get(s.fromUserId) || 'Unknown',
        },
        to: { id: s.toUserId, name: userMap.get(s.toUserId) || 'Unknown' },
        amountInPaise: s.amountInPaise,
      })),
      originalTransactionCount: netBalances.filter((b) => b.netInPaise !== 0)
        .length,
      simplifiedTransactionCount: simplified.length,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    return result;
  }

  async invalidateCache(groupId: string): Promise<void> {
    await this.redis.del(`balances:${groupId}`);
    await this.redis.del(`balances:simplified:${groupId}`);
    this.logger.debug(`Cache invalidated for group ${groupId}`);
  }

  @OnEvent('expense.created')
  @OnEvent('expense.updated')
  @OnEvent('expense.deleted')
  async handleExpenseChange(payload: { groupId: string }) {
    await this.invalidateCache(payload.groupId);
  }

  @OnEvent('settlement.created')
  async handleSettlementCreated(payload: { groupId: string }) {
    await this.invalidateCache(payload.groupId);
  }

  private async computeNetBalances(
    groupId: string,
  ): Promise<NetBalanceEntry[]> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const netMap = new Map<string, number>();
    for (const m of members) {
      netMap.set(m.userId, 0);
    }

    // Total paid per user
    const payments = await this.prisma.expense.groupBy({
      by: ['paidById'],
      where: { groupId, deletedAt: null },
      _sum: { amountInPaise: true },
    });
    for (const p of payments) {
      const current = netMap.get(p.paidById) || 0;
      netMap.set(p.paidById, current + (p._sum.amountInPaise || 0));
    }

    // Total owed per user (from splits)
    const splits = await this.prisma.$queryRaw<
      { user_id: string; total_owed: bigint }[]
    >`
      SELECT es.user_id, SUM(es.owed_amount_in_paise)::bigint as total_owed
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.group_id = ${groupId}::uuid
        AND e.deleted_at IS NULL
        AND es.user_id IS NOT NULL
      GROUP BY es.user_id
    `;
    for (const s of splits) {
      const current = netMap.get(s.user_id) || 0;
      netMap.set(s.user_id, current - Number(s.total_owed));
    }

    // Settlements: when A pays B to settle a debt,
    // A's net increases (debt reduced), B's net decreases (credit reduced)
    const settlementsOut = await this.prisma.settlement.groupBy({
      by: ['paidById'],
      where: { groupId },
      _sum: { amountInPaise: true },
    });
    for (const s of settlementsOut) {
      const current = netMap.get(s.paidById) || 0;
      netMap.set(s.paidById, current + (s._sum.amountInPaise || 0));
    }

    const settlementsIn = await this.prisma.settlement.groupBy({
      by: ['paidToId'],
      where: { groupId },
      _sum: { amountInPaise: true },
    });
    for (const s of settlementsIn) {
      const current = netMap.get(s.paidToId) || 0;
      netMap.set(s.paidToId, current - (s._sum.amountInPaise || 0));
    }

    return Array.from(netMap.entries()).map(([userId, netInPaise]) => ({
      userId,
      netInPaise,
    }));
  }

  private async computeBalancesFromDB(groupId: string) {
    const netBalances = await this.computeNetBalances(groupId);

    const userIds = netBalances.map((b) => b.userId);
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return {
      groupId,
      balances: netBalances.map((b) => ({
        userId: b.userId,
        userName: userMap.get(b.userId) || 'Unknown',
        netInPaise: b.netInPaise,
      })),
      updatedAt: new Date().toISOString(),
    };
  }
}
