import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseTypeService } from './expense-type.service';

describe('ExpensesTypeService', () => {
  let service: ExpenseTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseTypeService],
    }).compile();

    service = module.get<ExpenseTypeService>(ExpenseTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
