import { Module } from '@nestjs/common';
import { ExpenseTypeService } from './expense-type.service';
import { ExpenseTypeController } from './expense-type.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../utils/helper';

@Module({
  imports: [PrismaModule],
  controllers: [ExpenseTypeController],
  providers: [ExpenseTypeService, Helper],
  exports: [ExpenseTypeService],
})
export class ExpenseTypeModule {}
