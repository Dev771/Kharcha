import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import {
  AppEvent,
  ExpenseCreatedPayload,
  SettlementCreatedPayload,
  MemberJoinedPayload,
} from './events.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  // ─── Event Listeners ───

  @OnEvent(AppEvent.EXPENSE_CREATED)
  async handleExpenseCreated(payload: ExpenseCreatedPayload) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: payload.expenseId },
      include: {
        paidBy: { select: { name: true } },
        splits: {
          select: { userId: true, owedAmountInPaise: true },
        },
      },
    });
    if (!expense) return;

    const group = await this.prisma.group.findUnique({
      where: { id: payload.groupId },
      select: { name: true },
    });

    for (const split of expense.splits) {
      if (!split.userId || split.userId === payload.paidById) continue;

      const shareAmt = (split.owedAmountInPaise / 100).toFixed(2);

      // Compute net balance between this user and the payer in this group
      const netBalance = await this.computeNetBetween(
        payload.groupId,
        split.userId,
        payload.paidById,
      );

      let body = `${expense.paidBy.name} added "${expense.description}" — your share: Rs ${shareAmt}`;
      if (netBalance !== 0) {
        const netAmt = (Math.abs(netBalance) / 100).toFixed(2);
        if (netBalance < 0) {
          body += ` | You owe ${expense.paidBy.name} Rs ${netAmt} overall`;
        } else {
          body += ` | ${expense.paidBy.name} owes you Rs ${netAmt} overall`;
        }
      } else {
        body += ' | You are settled up';
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: split.userId,
          type: 'EXPENSE_ADDED',
          title: 'New expense added',
          body,
          metadata: {
            groupId: payload.groupId,
            expenseId: payload.expenseId,
            groupName: group?.name,
            shareInPaise: split.owedAmountInPaise,
            netInPaise: netBalance,
          },
        },
      });

      this.gateway.pushToUser(split.userId, {
        type: 'notification',
        notification,
      });
    }
  }

  @OnEvent(AppEvent.SETTLEMENT_CREATED)
  async handleSettlementCreated(payload: SettlementCreatedPayload) {
    const payer = await this.prisma.user.findUnique({
      where: { id: payload.paidById },
      select: { name: true },
    });
    const group = await this.prisma.group.findUnique({
      where: { id: payload.groupId },
      select: { name: true },
    });

    const amt = (payload.amountInPaise / 100).toFixed(2);
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.paidToId,
        type: 'SETTLEMENT_RECEIVED',
        title: 'Settlement received',
        body: `${payer?.name} settled Rs ${amt} with you`,
        metadata: {
          groupId: payload.groupId,
          groupName: group?.name,
        },
      },
    });

    this.gateway.pushToUser(payload.paidToId, {
      type: 'notification',
      notification,
    });
  }

  @OnEvent(AppEvent.GROUP_MEMBER_JOINED)
  async handleMemberJoined(payload: MemberJoinedPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: payload.groupId },
      select: { name: true },
    });

    const members = await this.prisma.groupMember.findMany({
      where: { groupId: payload.groupId, userId: { not: payload.userId } },
      select: { userId: true },
    });

    for (const member of members) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: member.userId,
          type: 'GROUP_INVITE',
          title: 'New member',
          body: `${payload.userName} joined "${group?.name}"`,
          metadata: {
            groupId: payload.groupId,
            groupName: group?.name,
          },
        },
      });

      this.gateway.pushToUser(member.userId, {
        type: 'notification',
        notification,
      });
    }
  }

  // ─── CRUD ───

  async getNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      cursor?: string;
      pageSize?: number;
    } = {},
  ) {
    const { unreadOnly = false, cursor, pageSize = 20 } = options;
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await this.prisma.notification.findMany({
      where,
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > pageSize;
    if (hasMore) notifications.pop();

    return {
      notifications,
      meta: {
        pageSize,
        hasMore,
        cursor:
          notifications.length > 0
            ? notifications[notifications.length - 1].id
            : undefined,
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { read: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { markedRead: result.count };
  }

  // ─── Helpers ───

  /**
   * Compute net balance of userA relative to userB in a group.
   * Negative = userA owes userB. Positive = userB owes userA.
   */
  private async computeNetBetween(
    groupId: string,
    userAId: string,
    userBId: string,
  ): Promise<number> {
    // What A paid in this group
    const aPaid = await this.prisma.expense.aggregate({
      where: { groupId, paidById: userAId, deletedAt: null },
      _sum: { amountInPaise: true },
    });
    // What A owes from splits
    const aOwed = await this.prisma.expenseSplit.aggregate({
      where: { userId: userAId, expense: { groupId, deletedAt: null } },
      _sum: { owedAmountInPaise: true },
    });
    // Settlements A paid out
    const aSettledOut = await this.prisma.settlement.aggregate({
      where: { groupId, paidById: userAId },
      _sum: { amountInPaise: true },
    });
    // Settlements A received
    const aSettledIn = await this.prisma.settlement.aggregate({
      where: { groupId, paidToId: userAId },
      _sum: { amountInPaise: true },
    });

    const aNet =
      (aPaid._sum.amountInPaise || 0) -
      (aOwed._sum.owedAmountInPaise || 0) +
      (aSettledOut._sum.amountInPaise || 0) -
      (aSettledIn._sum.amountInPaise || 0);

    // aNet: positive = others owe A, negative = A owes others
    // We return A's perspective relative to the group (not specifically to B)
    return aNet;
  }
}
