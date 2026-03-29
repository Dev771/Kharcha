import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  defaultCurrency: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.defaultCurrency !== undefined && { defaultCurrency: dto.defaultCurrency }),
      },
      select: USER_SELECT,
    });
  }

  async getUserSummary(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: { select: { id: true, name: true, isArchived: true } },
      },
    });

    const groupSummaries = [];
    let totalOwedInPaise = 0;
    let totalOwingInPaise = 0;

    for (const membership of memberships) {
      if (membership.group.isArchived) continue;
      const groupId = membership.group.id;

      // Total paid by this user in this group
      const paidResult = await this.prisma.expense.aggregate({
        where: { groupId, paidById: userId, deletedAt: null },
        _sum: { amountInPaise: true },
      });
      const totalPaid = paidResult._sum.amountInPaise || 0;

      // Total owed by this user in this group (from splits)
      const owedResult = await this.prisma.expenseSplit.aggregate({
        where: { userId, expense: { groupId, deletedAt: null } },
        _sum: { owedAmountInPaise: true },
      });
      const totalOwed = owedResult._sum.owedAmountInPaise || 0;

      // Settlements paid by user
      const settlementsPaidResult = await this.prisma.settlement.aggregate({
        where: { groupId, paidById: userId },
        _sum: { amountInPaise: true },
      });
      const settlementsPaid = settlementsPaidResult._sum.amountInPaise || 0;

      // Settlements received by user
      const settlementsReceivedResult = await this.prisma.settlement.aggregate({
        where: { groupId, paidToId: userId },
        _sum: { amountInPaise: true },
      });
      const settlementsReceived = settlementsReceivedResult._sum.amountInPaise || 0;

      // Net = totalPaid - totalOwed + settlementsPaid - settlementsReceived
      // When you pay a settlement, your debt decreases (net goes up)
      // When you receive a settlement, your credit decreases (net goes down)
      const net = totalPaid - totalOwed + settlementsPaid - settlementsReceived;

      if (net > 0) totalOwedInPaise += net;
      if (net < 0) totalOwingInPaise += Math.abs(net);

      groupSummaries.push({
        groupId,
        groupName: membership.group.name,
        netBalanceInPaise: net,
      });
    }

    return { totalOwedInPaise, totalOwingInPaise, groups: groupSummaries };
  }
}
