import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
  Next,
  HttpStatus,
  Req,
  Patch,
} from '@nestjs/common';
import { ProductSalesPriceService } from './product-sales-price.service';
import { CreateProductSalesPriceDto } from './dto/create-product-sales-price.dto';
import { NextFunction, Request, Response } from 'express';
import { ProductSalesPrice } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guards';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';

@Controller('/api/sales-price')
export class ProductSalesPriceController {
  constructor(
    private readonly productSalesPriceService: ProductSalesPriceService,
  ) {}

  @UseGuards(AdminGuard)
  @Post()
  async create(
    @Res() res: Response,
    @Body() createProductSalesPriceDto: CreateProductSalesPriceDto,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const saleProduct: ProductSalesPrice =
        await this.productSalesPriceService.create(createProductSalesPriceDto);

      res.status(HttpStatus.OK).json(saleProduct);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/:uuid')
  async updateProductSalesPrice(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Body() createProductSalesPriceDto: CreateProductSalesPriceDto,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const update: ExecuteResponse =
        await this.productSalesPriceService.update(
          createProductSalesPriceDto,
          uuid,
        );

      res.status(HttpStatus.OK).json(update);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get('/product/:uuid')
  async findAllSalesPriceByProduct(
    @Param('uuid') uuid: string,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const limit: number = Number(req.query.limit);
      const page: number = Number(req.query.page);

      const productSalesPrice: Paginate<ProductSalesPrice[]> =
        await this.productSalesPriceService.findAllSalesPriceByProduct(
          limit,
          page,
          uuid,
        );

      res.status(HttpStatus.OK).json(productSalesPrice);
    } catch (error) {
      next(error);
    }
  }
}
