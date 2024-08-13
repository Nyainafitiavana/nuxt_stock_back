import { Test, TestingModule } from '@nestjs/testing';
import { ProductSalesPriceService } from './product-sales-price.service';

describe('ProductSalesPriceService', () => {
  let service: ProductSalesPriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductSalesPriceService],
    }).compile();

    service = module.get<ProductSalesPriceService>(ProductSalesPriceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
