import {
  Controller,
  Get,
  UseGuards,
  Res,
  Next,
  HttpStatus,
} from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { AdminGuard } from '../auth/admin.guards';
import { NextFunction, Response } from 'express';
import { ICashRegister } from './cash-register.interface';

@Controller('/api/cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const category: ICashRegister =
        await this.cashRegisterService.cashSummary();

      res.status(HttpStatus.OK).json(category);
    } catch (error) {
      next(error);
    }
  }
}
