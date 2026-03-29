import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { RecurringService } from './recurring.service';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, RecurringService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
