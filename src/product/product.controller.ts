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
import { NextFunction, Request, Response } from 'express';
import { Product } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guards';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '../auth/auth.guards';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';
import { convertBigIntToString } from '../utils/utilis';

@Controller('/api/product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() createProductDto: CreateProductDto,
  ): Promise<void> {
    try {
      const product: Product =
        await this.productService.create(createProductDto);

      res.status(HttpStatus.OK).json(product);
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

      const category: string = req.query.category
        ? (req.query.category as string)
        : '';

      const unit: string = req.query.unit ? (req.query.unit as string) : '';

      const product: Paginate<Product[]> = await this.productService.findAll(
        limit,
        page,
        keyword,
        status,
        category,
        unit,
      );

      res.status(HttpStatus.OK).json(product);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get('/:uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const product: Product = await this.productService.findOne(uuid);

      res.status(HttpStatus.OK).json(product);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateProductDto: UpdateProductDto,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const updated: ExecuteResponse = await this.productService.update(
        uuid,
        updateProductDto,
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
      const deleted: ExecuteResponse = await this.productService.remove(uuid);

      res.status(HttpStatus.OK).json(deleted);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AuthGuard)
  @Get('/remaining/stock')
  async getProductRemaining(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const limit: number = req.query.limit ? Number(req.query.limit) : null;
      const page: number = req.query.page ? Number(req.query.page) : null;
      const startDate: string = req.query.startDate
        ? String(req.query.startDate)
        : null;
      const endDate: string = req.query.endDate
        ? String(req.query.endDate)
        : null;
      const categoryId: string = req.query.category
        ? String(req.query.category)
        : null;
      const unitId: string = req.query.unit ? String(req.query.unit) : null;
      const keyword: string = req.query.value
        ? (req.query.value as string)
        : '';

      const { data, count } =
        await this.productService.getProductRemainingStock(
          limit,
          page,
          keyword,
          startDate,
          endDate,
          categoryId,
          unitId,
        );

      // Convert BigInt values to strings
      const formattedData = convertBigIntToString(data);

      res
        .status(HttpStatus.OK)
        .json({ data: formattedData, totalRows: count, page: page });
    } catch (error) {
      next(error);
    }
  }
}
