import { PartialType } from '@nestjs/mapped-types';
import { CreateExpensesTypeDto } from './create-expenses-type.dto';

export class UpdateExpensesTypeDto extends PartialType(CreateExpensesTypeDto) {}
