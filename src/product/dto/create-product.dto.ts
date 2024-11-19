import { IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  public designation: string;

  @IsString()
  public code?: string;

  @IsString()
  public description?: string;

  @IsString()
  public idCategory: string;

  @IsString()
  public idUnit: string;
}
