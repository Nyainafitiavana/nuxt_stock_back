import { IsNumber } from 'class-validator';

export class UpdateProductSalesPriceDto {
  @IsNumber()
  public unitPrice: number;

  @IsNumber()
  public wholesale: number;

  @IsNumber()
  public purchasePrice: number;
}
