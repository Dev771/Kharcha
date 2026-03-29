import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettlementService } from './settlement.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@ApiTags('Settlements')
@Controller('groups/:groupId/settlements')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
@ApiBearerAuth()
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  @ApiOperation({ summary: 'Record a settlement payment' })
  async create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementService.create(groupId, dto);
  }

  @Post('split/:splitId')
  @ApiOperation({ summary: 'Settle a single expense split' })
  async settleSplit(
    @Param('groupId') groupId: string,
    @Param('splitId') splitId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementService.settleSplit(groupId, splitId, userId);
  }

  @Post('settle-all')
  @ApiOperation({ summary: 'Settle all unsettled splits between two users' })
  async settleAll(
    @Param('groupId') groupId: string,
    @Body() body: { fromUserId: string; toUserId: string },
  ) {
    return this.settlementService.settleAllBetween(
      groupId,
      body.fromUserId,
      body.toUserId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List settlement history for a group' })
  async list(@Param('groupId') groupId: string) {
    return this.settlementService.listForGroup(groupId);
  }
}
