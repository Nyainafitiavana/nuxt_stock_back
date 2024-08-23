import { PartialType } from '@nestjs/mapped-types';
import { CreateMovementDto } from './create-movement.dto';
import { IsArray, IsString } from 'class-validator';
import { MovementDetails } from '../details.interface';

export class UpdateMovementDto extends PartialType(CreateMovementDto) {}

export class UpdateDetailsDto {
  @IsArray()
  public details: MovementDetails[];
}

export class RejectDto {
  @IsString()
  public observation: string;
}
