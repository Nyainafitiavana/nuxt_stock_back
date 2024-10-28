import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpenseTypeService } from '../expense-type/expense-type.service';
import Helper from '../utils/helper';

@Module({
  imports: [PrismaModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, Helper, ExpenseTypeService],
})
export class ExpensesModule {}
