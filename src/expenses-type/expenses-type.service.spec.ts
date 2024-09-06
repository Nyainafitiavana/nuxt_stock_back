import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesTypeService } from './expenses-type.service';

describe('ExpensesTypeService', () => {
  let service: ExpensesTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpensesTypeService],
    }).compile();

    service = module.get<ExpensesTypeService>(ExpensesTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
