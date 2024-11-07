import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import Helper from '../utils/helper';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PdfController],
  providers: [PdfService, Helper, PrismaService],
  exports: [PdfService],
})
export class PdfModule {}
