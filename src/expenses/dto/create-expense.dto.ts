import { IsNumber, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  public description?: string;

  @IsNumber()
  public amount: number;

  @IsString()
  public idExpenseType: string;
}
