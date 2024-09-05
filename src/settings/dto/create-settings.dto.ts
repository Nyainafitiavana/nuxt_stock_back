import { IsString } from 'class-validator';

export class CreateSettingsDto {
  @IsString()
  public companyName: string;

  @IsString()
  public currencyType: string;

  @IsString()
  public companyEmail: string;

  @IsString()
  public companyAddress: string;

  @IsString()
  public companyPhoneNumber: string;
}
