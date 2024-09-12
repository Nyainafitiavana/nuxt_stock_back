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
import {
  ICashMonthly,
  ICashRegister,
  ICashWeekly,
  ICashYearly,
} from './cash-register.interface';

@Controller('/api/cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @UseGuards(AdminGuard)
  @Get('/global')
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ICashRegister =
        await this.cashRegisterService.cashGlobalSummary();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/weekly')
  async getSummaryWeekly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ICashWeekly[] =
        await this.cashRegisterService.getWeeklySummaryCash();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/monthly')
  async getSummaryMonthly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ICashMonthly[] =
        await this.cashRegisterService.getMonthlySummaryCash();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/yearly')
  async getSummaryYearly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ICashYearly[] =
        await this.cashRegisterService.getYearlySummaryCash();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}
