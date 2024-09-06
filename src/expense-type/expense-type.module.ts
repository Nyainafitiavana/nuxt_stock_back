import { Module } from '@nestjs/common';
import { ExpenseTypeService } from './expense-type.service';
import { ExpenseTypeController } from './expense-type.controller';
import Helper from '../../utils/helper';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExpenseTypeController],
  providers: [ExpenseTypeService, Helper],
})
export class ExpenseTypeModule {}
