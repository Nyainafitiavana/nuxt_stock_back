import { IsNumber, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  public designation: string;

  @IsString()
  public description: string;

  @IsNumber()
  public price: number;

  @IsString()
  public idCategory: string;
}
