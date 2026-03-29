import { Injectable, BadRequestException } from '@nestjs/common';
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
