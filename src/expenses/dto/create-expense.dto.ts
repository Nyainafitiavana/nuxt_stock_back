import { IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  description?: string;

  @IsString()
  idExpensesType;
}
