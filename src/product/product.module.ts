import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import Helper from '../../utils/helper';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryService } from '../category/category.service';
import { UnitService } from '../unit/unit.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, Helper, CategoryService, UnitService],
  exports: [ProductService],
})
export class ProductModule {}
