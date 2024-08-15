import { Module } from '@nestjs/common';
import { ProductSalesPriceService } from './product-sales-price.service';
import { ProductSalesPriceController } from './product-sales-price.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../../utils/helper';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { UnitService } from '../unit/unit.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductSalesPriceController],
  providers: [
    ProductSalesPriceService,
    Helper,
    ProductService,
    CategoryService,
    UnitService,
  ],
})
export class ProductSalesPriceModule {}
