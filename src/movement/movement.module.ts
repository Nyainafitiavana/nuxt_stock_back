import { Module } from '@nestjs/common';
import { MovementService } from './movement.service';
import { MovementController } from './movement.controller';
import Helper from '../../utils/helper';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MovementController],
  providers: [MovementService, Helper],
})
export class MovementModule {}
