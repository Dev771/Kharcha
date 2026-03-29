import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { renderCSV } from './csv.renderer';
import { renderTextReport } from './pdf.renderer';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateExport(
    groupId: string,
    options: {
      format: 'pdf' | 'csv';
      from?: string;
      to?: string;
      includeSettlements?: boolean;
    },
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    const where: any = { groupId, deletedAt: null };
    if (options.from)
      where.date = { ...where.date, gte: new Date(options.from) };
    if (options.to)
      where.date = { ...where.date, lte: new Date(options.to) };

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    let settlements: any[] = [];
    if (options.includeSettlements !== false) {
      settlements = await this.prisma.settlement.findMany({
        where: { groupId },
        include: {
          paidBy: { select: { name: true } },
          paidTo: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Compute per-member summary
    const memberMap = new Map<string, { name: string; paid: number; owed: number }>();
    for (const m of group!.members) {
      memberMap.set(m.userId, { name: m.user.name, paid: 0, owed: 0 });
    }
    for (const exp of expenses) {
      const entry = memberMap.get(exp.paidById);
      if (entry) entry.paid += exp.amountInPaise;
      for (const split of exp.splits) {
        if (split.userId) {
          const se = memberMap.get(split.userId);
          if (se) se.owed += split.owedAmountInPaise;
        }
      }
    }
    const memberSummary = Array.from(memberMap.values()).map((m) => ({
      ...m,
      net: m.paid - m.owed,
    }));

    if (options.format === 'csv') {
      return {
        content: renderCSV(group, expenses, settlements),
        contentType: 'text/csv',
        extension: 'csv',
      };
    }

    return {
      content: renderTextReport(group, expenses, settlements, memberSummary),
      contentType: 'text/plain',
      extension: 'txt',
    };
  }
}
