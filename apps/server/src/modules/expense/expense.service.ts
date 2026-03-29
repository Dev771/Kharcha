import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { calculateSplit } from '@kharcha/shared';
import type { SplitType } from '@kharcha/shared';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(groupId: string, dto: CreateExpenseDto) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.expense.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (existing) return existing;
    }

    // Validate paidBy is a group member
    const payerMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.paidById } },
    });
    if (!payerMembership) {
      throw new BadRequestException('Payer must be a member of this group');
    }

    // Validate all split participants are group members
    const splitUserIds = dto.splits.map((s) => s.userId);
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { in: splitUserIds } },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    for (const uid of splitUserIds) {
      if (!memberIds.has(uid)) {
        throw new BadRequestException(
          `User ${uid} is not a member of this group`,
        );
      }
    }

    // Calculate splits using shared engine
    let splitResults;
    try {
      splitResults = calculateSplit({
        totalInPaise: dto.amountInPaise,
        splitType: dto.splitType as SplitType,
        participants: dto.splits.map((s) => ({
          userId: s.userId,
          value: s.value,
        })),
      });
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    // Create expense + splits in transaction
    const expense = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          paidById: dto.paidById,
          amountInPaise: dto.amountInPaise,
          currency: dto.currency || 'INR',
          description: dto.description,
          category: dto.category,
          tags: dto.tags || [],
          splitType: dto.splitType as any,
          date: new Date(dto.date),
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.expenseSplit.createMany({
        data: splitResults.map((s) => {
          const original = dto.splits.find((ds) => ds.userId === s.userId);
          return {
            expenseId: exp.id,
            userId: s.userId,
            owedAmountInPaise: s.owedInPaise,
            shareValue: original?.value ?? null,
          };
        }),
      });

      return exp;
    });

    // Emit event
    this.eventEmitter.emit('expense.created', {
      groupId,
      expenseId: expense.id,
      paidById: dto.paidById,
      affectedUserIds: splitUserIds,
    });

    return this.getDetail(groupId, expense.id);
  }

  async list(groupId: string, filters: ExpenseFilterDto) {
    const { cursor, pageSize = 20, category, from, to, paidBy, splitWith, search, sort } = filters;

    const where: any = { groupId, deletedAt: null };
    if (category) where.category = category;
    if (from) where.date = { ...where.date, gte: new Date(from) };
    if (to) where.date = { ...where.date, lte: new Date(to) };
    if (paidBy) where.paidById = paidBy;
    if (search) where.description = { contains: search, mode: 'insensitive' };
    if (splitWith) {
      where.splits = { some: { userId: splitWith } };
    }

    // Parse sort
    let orderBy: any = { date: 'desc' };
    if (sort) {
      const [field, dir] = sort.split(':');
      if (['date', 'amountInPaise', 'createdAt'].includes(field)) {
        orderBy = { [field]: dir === 'asc' ? 'asc' : 'desc' };
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      take: pageSize + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    const hasMore = expenses.length > pageSize;
    if (hasMore) expenses.pop();

    return {
      expenses,
      meta: {
        pageSize,
        hasMore,
        total: await this.prisma.expense.count({ where }),
        ...(expenses.length > 0 && {
          cursor: expenses[expenses.length - 1].id,
        }),
      },
    };
  }

  async getDetail(groupId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId, deletedAt: null },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async softDelete(
    groupId: string,
    expenseId: string,
    userId: string,
    userRole: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId, deletedAt: null },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    if (expense.paidById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only the payer or group admin can delete this expense',
      );
    }

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });

    this.eventEmitter.emit('expense.deleted', {
      groupId,
      expenseId,
    });

    return { deleted: true };
  }

  async getCategoryBreakdown(
    groupId: string,
    options: { from?: string; to?: string },
  ) {
    const where: any = { groupId, deletedAt: null };
    if (options.from)
      where.date = { ...where.date, gte: new Date(options.from) };
    if (options.to)
      where.date = { ...where.date, lte: new Date(options.to) };

    const breakdown = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amountInPaise: true },
      _count: { id: true },
      orderBy: { _sum: { amountInPaise: 'desc' } },
    });

    return {
      categories: breakdown.map((b) => ({
        category: b.category || 'uncategorized',
        totalInPaise: b._sum.amountInPaise || 0,
        count: b._count.id,
      })),
      totalInPaise: breakdown.reduce(
        (s, b) => s + (b._sum.amountInPaise || 0),
        0,
      ),
    };
  }
}
