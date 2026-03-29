import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { randomBytes } from 'crypto';

const generateInviteCode = (): string =>
  randomBytes(5).toString('base64url').slice(0, 10);

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          createdById: userId,
          inviteCode: generateInviteCode(),
        },
      });

      await tx.groupMember.create({
        data: { groupId: g.id, userId, role: 'ADMIN' },
      });

      return g;
    });

    // Add initial members by email if provided
    if (dto.memberEmails && dto.memberEmails.length > 0) {
      await this.addMembersByEmail(group.id, dto.memberEmails);
    }

    return this.getDetail(group.id);
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                expenses: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
      orderBy: { group: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => ({
      ...m.group,
      memberCount: m.group._count.members,
      expenseCount: m.group._count.expenses,
      myRole: m.role,
    }));
  }

  async getDetail(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { expenses: { where: { deletedAt: null } } } },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    return {
      ...group,
      memberCount: group.members.length,
      expenseCount: group._count.expenses,
    };
  }

  async update(groupId: string, dto: UpdateGroupDto, requestRole: string) {
    if (requestRole !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can update group details');
    }

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
      },
    });

    return this.getDetail(groupId);
  }

  async archive(groupId: string, requestRole: string) {
    if (requestRole !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can archive groups');
    }

    await this.prisma.group.update({
      where: { id: groupId },
      data: { isArchived: true },
    });

    return { archived: true };
  }

  async getInviteCode(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { inviteCode: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    return { inviteCode: group.inviteCode };
  }

  async regenerateInviteCode(groupId: string, requestRole: string) {
    if (requestRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Only group admins can regenerate invite codes',
      );
    }

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: generateInviteCode() },
      select: { inviteCode: true },
    });

    return { inviteCode: group.inviteCode };
  }

  async joinByInviteCode(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) throw new NotFoundException('Invalid invite code');
    if (group.isArchived)
      throw new BadRequestException('This group has been archived');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });

    if (existing)
      throw new ConflictException('You are already a member of this group');

    await this.prisma.groupMember.create({
      data: { groupId: group.id, userId, role: 'MEMBER' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    this.eventEmitter.emit('group.member.joined', {
      groupId: group.id,
      userId,
      userName: user?.name || 'Someone',
    });

    return this.getDetail(group.id);
  }

  // ─── Member Management ───

  async addMemberByEmail(
    groupId: string,
    email: string,
    requestRole: string,
  ) {
    if (requestRole !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can add members');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(
        `No registered user found with email "${normalizedEmail}". They need to sign up first.`,
      );
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException(
        `${user.name} is already a member of this group`,
      );
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { isArchived: true },
    });
    if (group?.isArchived) {
      throw new BadRequestException(
        'Cannot add members to an archived group',
      );
    }

    await this.prisma.groupMember.create({
      data: { groupId, userId: user.id, role: 'MEMBER' },
    });

    this.eventEmitter.emit('group.member.joined', {
      groupId,
      userId: user.id,
      userName: user.name,
    });

    return {
      added: true,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async addMembersByEmail(groupId: string, emails: string[]) {
    const results = { added: [] as string[], notFound: [] as string[], alreadyMember: [] as string[] };

    for (const email of emails) {
      const normalized = email.toLowerCase().trim();
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, name: true },
      });

      if (!user) {
        results.notFound.push(normalized);
        continue;
      }

      const existing = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });
      if (existing) {
        results.alreadyMember.push(normalized);
        continue;
      }

      await this.prisma.groupMember.create({
        data: { groupId, userId: user.id, role: 'MEMBER' },
      });

      this.eventEmitter.emit('group.member.joined', {
        groupId,
        userId: user.id,
        userName: user.name,
      });

      results.added.push(normalized);
    }

    return results;
  }

  async removeMember(
    groupId: string,
    targetUserId: string,
    requestUserId: string,
    requestRole: string,
  ) {
    if (requestRole !== 'ADMIN' && requestUserId !== targetUserId) {
      throw new ForbiddenException(
        'Only admins can remove other members. You can only remove yourself.',
      );
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this group');
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.groupMember.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin. Transfer admin role first.',
        );
      }
    }

    // Check unsettled balances
    const paidTotal = await this.prisma.expense.aggregate({
      where: { groupId, paidById: targetUserId, deletedAt: null },
      _sum: { amountInPaise: true },
    });
    const owedTotal = await this.prisma.expenseSplit.aggregate({
      where: { userId: targetUserId, expense: { groupId, deletedAt: null } },
      _sum: { owedAmountInPaise: true },
    });
    const settlementsPaid = await this.prisma.settlement.aggregate({
      where: { groupId, paidById: targetUserId },
      _sum: { amountInPaise: true },
    });
    const settlementsReceived = await this.prisma.settlement.aggregate({
      where: { groupId, paidToId: targetUserId },
      _sum: { amountInPaise: true },
    });

    const net =
      (paidTotal._sum.amountInPaise || 0) -
      (owedTotal._sum.owedAmountInPaise || 0) +
      (settlementsPaid._sum.amountInPaise || 0) -
      (settlementsReceived._sum.amountInPaise || 0);

    if (net !== 0) {
      const formatted = (Math.abs(net) / 100).toFixed(2);
      const direction = net > 0 ? 'is owed' : 'owes';
      throw new BadRequestException(
        `Cannot remove — member ${direction} Rs ${formatted}. Settle balances first.`,
      );
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    return { removed: true, userId: targetUserId };
  }

  async searchUsersToInvite(groupId: string, query: string) {
    if (!query || query.trim().length < 2) return [];

    const existingMemberIds = (
      await this.prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    return this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { notIn: existingMemberIds.length > 0 ? existingMemberIds : ['_'] },
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { email: { contains: query.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 10,
    });
  }
}
