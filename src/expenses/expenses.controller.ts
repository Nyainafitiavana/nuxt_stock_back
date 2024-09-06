import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  Next,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AdminGuard } from '../auth/admin.guards';
import { NextFunction, Request, Response } from 'express';
import { Expenses } from '@prisma/client';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';

@Controller('/api/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Body() createExpenseDto: CreateExpenseDto,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const expenses: Expenses =
        await this.expensesService.create(createExpenseDto);

      res.status(HttpStatus.OK).json(expenses);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const limit: number = req.query.limit ? Number(req.query.limit) : null;
      const page: number = req.query.page ? Number(req.query.page) : null;
      const expenseTypeId: string = req.query.expenseTypeId
        ? (req.query.expenseTypeId as string)
        : null;
      const startDate: string = req.query.startDate
        ? String(req.query.startDate)
        : '';
      const endDate: string = req.query.endDate
        ? String(req.query.endDate)
        : '';
      const status: string = req.query.status
        ? (req.query.status as string)
        : '';

      const expenses: Paginate<Expenses[]> = await this.expensesService.findAll(
        limit,
        page,
        expenseTypeId,
        status,
        startDate,
        endDate,
      );

      res.status(HttpStatus.OK).json(expenses);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const expensesType: Expenses = await this.expensesService.findOne(uuid);

      res.status(HttpStatus.OK).json(expensesType);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.expensesService.update(
        uuid,
        updateExpenseDto,
      );

      res.status(HttpStatus.OK).json(updated);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':uuid')
  async remove(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const deleted: ExecuteResponse = await this.expensesService.remove(uuid);

      res.status(HttpStatus.OK).json(deleted);
    } catch (error) {
      next(error);
    }
  }
}
