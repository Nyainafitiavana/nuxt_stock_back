import { IsString } from 'class-validator';

export class CreateExpensesTypeDto {
  @IsString()
  public designation: string;
}
