import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, string> = { status: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    try {
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG' ? 'connected' : 'degraded';
    } catch {
      checks.redis = 'disconnected';
      checks.status = 'degraded';
    }

    checks.timestamp = new Date().toISOString();
    return checks;
  }
}
