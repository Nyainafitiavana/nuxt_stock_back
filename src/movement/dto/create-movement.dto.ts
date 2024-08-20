import { IsArray, IsBoolean } from 'class-validator';
import { MovementDetails } from '../details.interface';

export class CreateMovementDto {
  @IsBoolean()
  public isSales: boolean;

  @IsArray()
  public details: MovementDetails[];
}
