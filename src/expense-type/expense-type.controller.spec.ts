import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseTypeController } from './expense-type.controller';
import { ExpenseTypeService } from './expense-type.service';

describe('ExpensesTypeController', () => {
  let controller: ExpenseTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseTypeController],
      providers: [ExpenseTypeService],
    }).compile();

    controller = module.get<ExpenseTypeController>(ExpenseTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
