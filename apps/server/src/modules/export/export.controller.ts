import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { ExportService } from './export.service';

@ApiTags('Export')
@Controller('groups/:groupId/export')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Export group expenses as PDF/CSV' })
  async exportGroup(
    @Param('groupId') groupId: string,
    @Query('format') format: 'pdf' | 'csv' = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeSettlements') includeSettlements?: string,
    @Res() res?: Response,
  ) {
    const result = await this.exportService.generateExport(groupId, {
      format,
      from,
      to,
      includeSettlements: includeSettlements !== 'false',
    });

    const filename = `kharcha-${groupId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`;

    res!.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${filename}.${result.extension}"`,
    });
    res!.send(result.content);
  }
}
