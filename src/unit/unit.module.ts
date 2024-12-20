import { Module } from '@nestjs/common';
import { UnitService } from './unit.service';
import { UnitController } from './unit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../utils/helper';

@Module({
  imports: [PrismaModule],
  controllers: [UnitController],
  providers: [UnitService, Helper],
  exports: [UnitService],
})
export class UnitModule {}
