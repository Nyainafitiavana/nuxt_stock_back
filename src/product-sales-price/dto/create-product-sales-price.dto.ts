import { IsNumber, IsString } from 'class-validator';

export class CreateProductSalesPriceDto {
  @IsString()
  public idProduct: string;

  @IsNumber()
  public unitPrice: number;

  @IsNumber()
  public wholesale: number;
}
