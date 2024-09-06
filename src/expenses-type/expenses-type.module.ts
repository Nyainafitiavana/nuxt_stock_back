import { Module } from '@nestjs/common';
import { ExpensesTypeService } from './expenses-type.service';
import { ExpensesTypeController } from './expenses-type.controller';
import Helper from '../../utils/helper';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExpensesTypeController],
  providers: [ExpensesTypeService, Helper],
})
export class ExpensesTypeModule {}
