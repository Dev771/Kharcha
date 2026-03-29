import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(groupId: string, dto: CreateSettlementDto) {
    if (dto.paidById === dto.paidToId) {
      throw new BadRequestException('Cannot settle with yourself');
    }

    const [payerMember, payeeMember] = await Promise.all([
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: dto.paidById } },
      }),
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: dto.paidToId } },
      }),
    ]);

    if (!payerMember)
      throw new BadRequestException('Payer is not a member of this group');
    if (!payeeMember)
      throw new BadRequestException('Payee is not a member of this group');

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        paidById: dto.paidById,
        paidToId: dto.paidToId,
        amountInPaise: dto.amountInPaise,
        note: dto.note?.trim() || null,
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        paidTo: { select: { id: true, name: true } },
      },
    });

    this.eventEmitter.emit('settlement.created', {
      groupId,
      settlementId: settlement.id,
      paidById: dto.paidById,
      paidToId: dto.paidToId,
      amountInPaise: dto.amountInPaise,
    });

    return settlement;
  }

  async settleSplit(groupId: string, splitId: string, userId: string) {
    const split = await this.prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        expense: { select: { id: true, groupId: true, paidById: true } },
      },
    });

    if (!split || split.expense.groupId !== groupId) {
      throw new NotFoundException('Split not found');
    }
    if (split.isSettled) return split;
    if (split.userId !== userId && split.expense.paidById !== userId) {
      throw new BadRequestException('Only the debtor or payer can settle this split');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.expenseSplit.update({
        where: { id: splitId },
        data: { isSettled: true, settledAt: new Date() },
        include: { user: { select: { id: true, name: true } } },
      });

      if (split.userId && split.userId !== split.expense.paidById) {
        await tx.settlement.create({
          data: {
            groupId,
            paidById: split.userId,
            paidToId: split.expense.paidById,
            amountInPaise: split.owedAmountInPaise,
            note: 'Settled individual expense split',
          },
        });
      }

      return result;
    });

    this.eventEmitter.emit('settlement.created', { groupId });
    return updated;
  }

  async settleAllBetween(groupId: string, fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot settle with yourself');
    }

    const unsettledSplits = await this.prisma.expenseSplit.findMany({
      where: {
        userId: fromUserId,
        isSettled: false,
        expense: { groupId, paidById: toUserId, deletedAt: null },
      },
    });

    if (unsettledSplits.length === 0) {
      return { settledCount: 0, totalAmountInPaise: 0 };
    }

    const totalAmount = unsettledSplits.reduce((sum, s) => sum + s.owedAmountInPaise, 0);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.updateMany({
        where: { id: { in: unsettledSplits.map((s) => s.id) } },
        data: { isSettled: true, settledAt: now },
      });

      await tx.settlement.create({
        data: {
          groupId,
          paidById: fromUserId,
          paidToId: toUserId,
          amountInPaise: totalAmount,
          note: `Settled ${unsettledSplits.length} expense${unsettledSplits.length > 1 ? 's' : ''}`,
        },
      });
    });

    this.eventEmitter.emit('settlement.created', { groupId });
    return { settledCount: unsettledSplits.length, totalAmountInPaise: totalAmount };
  }

  async listForGroup(groupId: string) {
    return this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        paidTo: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
