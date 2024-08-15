import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../../utils/helper';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController],
  providers: [CategoryService, Helper],
  exports: [CategoryService],
})
export class CategoryModule {}
