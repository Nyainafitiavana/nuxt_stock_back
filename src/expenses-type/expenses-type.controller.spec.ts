import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesTypeController } from './expenses-type.controller';
import { ExpensesTypeService } from './expenses-type.service';

describe('ExpensesTypeController', () => {
  let controller: ExpensesTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesTypeController],
      providers: [ExpensesTypeService],
    }).compile();

    controller = module.get<ExpensesTypeController>(ExpensesTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
