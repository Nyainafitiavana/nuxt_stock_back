import { Module } from '@nestjs/common';
import { ProductSalesPriceService } from './product-sales-price.service';
import { ProductSalesPriceController } from './product-sales-price.controller';
import { PrismaModule } from '../prisma/prisma.module';
import Helper from '../../utils/helper';
import { ProductService } from '../product/product.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductSalesPriceController],
  providers: [ProductSalesPriceService, Helper, ProductService],
})
export class ProductSalesPriceModule {}
