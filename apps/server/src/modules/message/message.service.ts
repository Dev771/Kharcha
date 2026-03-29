import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessages(
    groupId: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const messages = await this.prisma.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return {
      messages: items,
      meta: {
        pageSize: limit,
        hasMore,
        cursor: nextCursor,
      },
    };
  }

  async createMessage(
    groupId: string,
    senderId: string,
    dto: CreateMessageDto,
  ) {
    const message = await this.prisma.message.create({
      data: {
        groupId,
        senderId,
        content: dto.content,
        type: (dto.type as any) || 'TEXT',
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return message;
  }
}
