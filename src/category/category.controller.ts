import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Next,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { NextFunction, Request, Response } from 'express';
import { Category } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guards';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';

@Controller('/api/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<void> {
    try {
      const category: Category =
        await this.categoryService.create(createCategoryDto);

      res.status(HttpStatus.OK).json(category);
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

      const category: Paginate<Category[]> = await this.categoryService.findAll(
        limit,
        page,
        keyword,
        status,
      );

      res.status(HttpStatus.OK).json(category);
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
      const category: Category = await this.categoryService.findOne(uuid);

      res.status(HttpStatus.OK).json(category);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.categoryService.update(
        uuid,
        updateCategoryDto,
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
      const deleted: ExecuteResponse = await this.categoryService.remove(uuid);

      res.status(HttpStatus.OK).json(deleted);
    } catch (error) {
      next(error);
    }
  }
}
