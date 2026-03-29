import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);
  private clients = new Map<string, Response[]>();

  addClient(userId: string, res: Response): void {
    const existing = this.clients.get(userId) ?? [];
    existing.push(res);
    this.clients.set(userId, existing);
    this.logger.debug(
      `SSE connected: ${userId} (${existing.length} conns)`,
    );
  }

  removeClient(userId: string, res: Response): void {
    const conns = this.clients.get(userId) ?? [];
    const filtered = conns.filter((c) => c !== res);
    if (filtered.length > 0) {
      this.clients.set(userId, filtered);
    } else {
      this.clients.delete(userId);
    }
  }

  pushToUser(userId: string, data: Record<string, unknown>): void {
    const conns = this.clients.get(userId) ?? [];
    if (conns.length === 0) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    conns.forEach((res) => {
      try {
        res.write(payload);
      } catch {
        /* disconnected */
      }
    });
  }
}
