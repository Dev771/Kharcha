import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { BalanceService } from './balance.service';

@ApiTags('Balances')
@Controller('groups/:groupId/balances')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
@ApiBearerAuth()
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get pairwise balances for a group' })
  async getBalances(@Param('groupId') groupId: string) {
    return this.balanceService.getGroupBalances(groupId);
  }

  @Get('simplified')
  @ApiOperation({
    summary: 'Get simplified settlement plan (minimum transactions)',
  })
  async getSimplified(@Param('groupId') groupId: string) {
    return this.balanceService.getSimplifiedBalances(groupId);
  }
}
