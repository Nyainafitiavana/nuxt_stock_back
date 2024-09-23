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
  ICashRegister,
  IExpenses,
  IProfitLoss,
  ISalesPurchase,
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
  @Get('/profit-loss/weekly')
  async getProfitAndLossWeekly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IProfitLoss[] =
        await this.cashRegisterService.getWeeklyProfitAndLoss();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/profit-loss/monthly')
  async getProfitAndLossMonthly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IProfitLoss[] =
        await this.cashRegisterService.getMonthlyProfitAndLoss();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/profit-loss/yearly')
  async getProfitAndLossYearly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IProfitLoss[] =
        await this.cashRegisterService.getYearlyProfitAndLoss();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/sales-purchase/weekly')
  async getSalesAndPurchaseWeekly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ISalesPurchase[] =
        await this.cashRegisterService.getWeeklySalesAndPurchase();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/sales-purchase/monthly')
  async getSalesAndPurchaseMonthly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ISalesPurchase[] =
        await this.cashRegisterService.getMonthlySalesAndPurchase();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/sales-purchase/yearly')
  async getSalesAndPurchaseYearly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: ISalesPurchase[] =
        await this.cashRegisterService.getYearlySalesAndPurchase();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/expenses/weekly')
  async getExpensesWeekly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IExpenses[] =
        await this.cashRegisterService.getWeeklyExpenses();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/expenses/monthly')
  async getExpensesMonthly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IExpenses[] =
        await this.cashRegisterService.getMonthlyExpenses();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/expenses/yearly')
  async getExpensesYearly(
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const result: IExpenses[] =
        await this.cashRegisterService.getYearlyExpenses();

      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}
