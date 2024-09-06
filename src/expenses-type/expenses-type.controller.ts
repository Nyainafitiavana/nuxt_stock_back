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
import { ExpensesTypeService } from './expenses-type.service';
import { CreateExpensesTypeDto } from './dto/create-expenses-type.dto';
import { UpdateExpensesTypeDto } from './dto/update-expenses-type.dto';
import { AdminGuard } from '../auth/admin.guards';
import { NextFunction, Request, Response } from 'express';
import { ExpensesType } from '@prisma/client';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';

@Controller('/api/expenses-type')
export class ExpensesTypeController {
  constructor(private readonly expensesTypeService: ExpensesTypeService) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Body() createExpensesTypeDto: CreateExpensesTypeDto,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const expensiveType: ExpensesType = await this.expensesTypeService.create(
        createExpensesTypeDto,
      );

      res.status(HttpStatus.OK).json(expensiveType);
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
      const keyword: string = req.query.value
        ? (req.query.value as string)
        : '';
      const status: string = req.query.status
        ? (req.query.status as string)
        : '';

      const expensesType: Paginate<ExpensesType[]> =
        await this.expensesTypeService.findAll(limit, page, keyword, status);

      res.status(HttpStatus.OK).json(expensesType);
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
      const expensesType: ExpensesType =
        await this.expensesTypeService.findOne(uuid);

      res.status(HttpStatus.OK).json(expensesType);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() expensesTypeDto: UpdateExpensesTypeDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.expensesTypeService.update(
        uuid,
        expensesTypeDto,
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
      const deleted: ExecuteResponse =
        await this.expensesTypeService.remove(uuid);

      res.status(HttpStatus.OK).json(deleted);
    } catch (error) {
      next(error);
    }
  }
}
