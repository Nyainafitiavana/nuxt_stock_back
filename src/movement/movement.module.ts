import { Module } from '@nestjs/common';
import { MovementService } from './movement.service';
import { MovementController } from './movement.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../utils/helper';
import { PdfService } from '../pdf/pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [MovementController],
  providers: [MovementService, Helper, PdfService],
})
export class MovementModule {}
