import { Test, TestingModule } from '@nestjs/testing';
import { ProductSalesPriceController } from './product-sales-price.controller';
import { ProductSalesPriceService } from './product-sales-price.service';

describe('ProductSalesPriceController', () => {
  let controller: ProductSalesPriceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductSalesPriceController],
      providers: [ProductSalesPriceService],
    }).compile();

    controller = module.get<ProductSalesPriceController>(
      ProductSalesPriceController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
