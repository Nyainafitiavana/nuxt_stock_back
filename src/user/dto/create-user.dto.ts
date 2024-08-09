import { IsBoolean, IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  public firstName: string;

  @IsString()
  public lastName: string;

  @IsEmail()
  public email: string;

  @IsBoolean()
  public isAdmin: boolean;

  @IsString()
  public phone: string;

  @IsString()
  public password: string;
}
