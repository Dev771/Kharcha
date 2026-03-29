import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';

@ApiTags('Expenses')
@Controller('groups/:groupId/expenses')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
@ApiBearerAuth()
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @ApiOperation({ summary: 'Create expense with splits' })
  async create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(groupId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses (filterable, paginated)' })
  async list(
    @Param('groupId') groupId: string,
    @Query() filters: ExpenseFilterDto,
  ) {
    return this.expenseService.list(groupId, filters);
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Get expense breakdown by category' })
  async getBreakdown(
    @Param('groupId') groupId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expenseService.getCategoryBreakdown(groupId, { from, to });
  }

  @Get(':expenseId')
  @ApiOperation({ summary: 'Get expense detail with splits' })
  async getDetail(
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.expenseService.getDetail(groupId, expenseId);
  }

  @Patch(':expenseId')
  @ApiOperation({ summary: 'Update expense (payer or admin only)' })
  async update(
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.expenseService.update(
      groupId,
      expenseId,
      dto,
      userId,
      req.groupRole,
    );
  }

  @Delete(':expenseId')
  @ApiOperation({ summary: 'Soft-delete expense (payer or admin only)' })
  async delete(
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    return this.expenseService.softDelete(
      groupId,
      expenseId,
      userId,
      req.groupRole,
    );
  }
}
