import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringExpenses() {
    this.logger.log('Processing recurring expenses...');

    const recurringExpenses = await this.prisma.expense.findMany({
      where: {
        isRecurring: true,
        deletedAt: null,
        recurrenceRule: { not: null },
      },
      include: { splits: true },
    });

    let created = 0;

    for (const expense of recurringExpenses) {
      try {
        if (!this.shouldCreateOccurrence(expense)) continue;

        const newExpense = await this.prisma.expense.create({
          data: {
            groupId: expense.groupId,
            paidById: expense.paidById,
            amountInPaise: expense.amountInPaise,
            currency: expense.currency,
            description: expense.description,
            category: expense.category,
            tags: expense.tags,
            splitType: expense.splitType,
            date: new Date(),
            isRecurring: false,
            splits: {
              createMany: {
                data: expense.splits.map((s) => ({
                  userId: s.userId,
                  participantId: s.participantId,
                  owedAmountInPaise: s.owedAmountInPaise,
                  shareValue: s.shareValue,
                })),
              },
            },
          },
        });

        this.eventEmitter.emit('expense.created', {
          groupId: expense.groupId,
          expenseId: newExpense.id,
          paidById: expense.paidById,
          affectedUserIds: expense.splits
            .filter((s) => s.userId)
            .map((s) => s.userId),
        });

        created++;
      } catch (err) {
        this.logger.error(
          `Failed to create recurring expense ${expense.id}`,
          err,
        );
      }
    }

    this.logger.log(`Created ${created} recurring expense instances`);
  }

  private shouldCreateOccurrence(expense: any): boolean {
    const rule = expense.recurrenceRule as string;
    const lastDate = new Date(expense.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!rule) return false;

    if (rule.includes('FREQ=WEEKLY')) {
      const daysSince = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysSince >= 7;
    }

    if (rule.includes('FREQ=MONTHLY')) {
      const monthsSince =
        (today.getFullYear() - lastDate.getFullYear()) * 12 +
        (today.getMonth() - lastDate.getMonth());
      return monthsSince >= 1;
    }

    return false;
  }
}
