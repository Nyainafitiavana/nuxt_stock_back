import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductSalesPriceDto } from './dto/create-product-sales-price.dto';
import { Prisma, Product, ProductSalesPrice, Status } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ProductService } from '../product/product.service';
import { CustomException } from '../../utils/ExeptionCustom';

@Injectable()
export class ProductSalesPriceService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
    private productService: ProductService,
  ) {}

  async create(
    createProductSalesPriceDto: CreateProductSalesPriceDto,
  ): Promise<ProductSalesPrice> {
    const findActiveStatus: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const findProduct: Product = await this.productService.findOne(
      createProductSalesPriceDto.idProduct,
    );

    //Check if active product sales price exist
    const findActiveProductSalePrice: ProductSalesPrice =
      await this.findCurrentSalesPriceProduct(
        createProductSalesPriceDto.idProduct,
      );
    //Even we have a current price for the product, we need to update the current status to old, then we can create a new product sales prices
    if (findActiveProductSalePrice) {
      await this.updateCurrentSalesPriceActiveToOld(
        findActiveProductSalePrice.uuid,
      );
    }

    //Remove idProduct (uuid) in the dto because we have already a real product object
    delete createProductSalesPriceDto.idProduct;

    const createProductSalesPrice: ProductSalesPrice =
      await this.prisma.productSalesPrice.create({
        data: {
          ...createProductSalesPriceDto,
          productId: findProduct.id,
          statusId: findActiveStatus.id,
          uuid: await this.helper.generateUuid(),
        },
      });

    delete createProductSalesPrice.id;
    delete createProductSalesPrice.productId;
    delete createProductSalesPrice.statusId;

    return createProductSalesPrice;
  }

  async findAllSalesPriceByProduct(
    limit: number = null,
    page: number = null,
    productId: string,
  ): Promise<Paginate<ProductSalesPrice[]>> {
    const offset: number = await this.helper.calculOffset(limit, page);

    const query: Prisma.ProductSalesPriceFindManyArgs = {
      take: limit,
      skip: offset,
      where: {
        product: {
          uuid: productId,
        },
      },
      select: {
        unitPrice: true,
        wholesale: true,
        createdAt: true,
        uuid: true,
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
      },
      orderBy: {
        status: {
          id: 'asc',
        },
      },
    };

    const [data, count] = await this.prisma.$transaction([
      this.prisma.productSalesPrice.findMany(query),
      this.prisma.productSalesPrice.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findCurrentSalesPriceProduct(
    productId: string,
  ): Promise<ProductSalesPrice | null> {
    const productSalesPrice: ProductSalesPrice =
      await this.prisma.productSalesPrice.findFirst({
        where: {
          product: { uuid: productId },
          status: { code: STATUS.ACTIVE },
        },
        include: {
          status: {
            select: {
              designation: true,
              code: true,
              uuid: true,
            },
          },
        },
      });

    if (productSalesPrice) {
      delete productSalesPrice.id;
      return productSalesPrice;
    } else {
      return null;
    }
  }

  async findOneSalesPriceById(
    salesPriceId: string,
  ): Promise<ProductSalesPrice> {
    const productSalesPrice: ProductSalesPrice =
      await this.prisma.productSalesPrice.findUnique({
        where: {
          uuid: salesPriceId,
        },
        include: {
          status: {
            select: {
              designation: true,
              code: true,
              uuid: true,
            },
          },
        },
      });

    if (!productSalesPrice) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    return productSalesPrice;
  }

  async updateCurrentSalesPriceActiveToOld(
    salesPriceId: string,
  ): Promise<ExecuteResponse> {
    const findOldStatus: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.OLD },
    });

    await this.prisma.productSalesPrice.update({
      where: {
        uuid: salesPriceId,
      },
      data: {
        statusId: findOldStatus.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async turnToActiveOrToOldSalesPrices(
    salesPriceId: string,
    productId: string,
  ): Promise<ExecuteResponse> {
    //Check if active product sales price exist
    const findActiveProductSalePrice: ProductSalesPrice =
      await this.findCurrentSalesPriceProduct(productId);
    //Even we have a current price for the product, we need to update the current status to old, then we can turn to activate another sales prices with salesPriceId
    if (findActiveProductSalePrice) {
      await this.updateCurrentSalesPriceActiveToOld(
        findActiveProductSalePrice.uuid,
      );
    }

    //Find the product sales price cable
    const productSalesPrice: ProductSalesPrice =
      await this.findOneSalesPriceById(salesPriceId);
    //Find the status of this sales price cable
    const findStatusProductSalesPrice: Status =
      await this.prisma.status.findUnique({
        where: { id: productSalesPrice.statusId },
      });

    let status: string;
    //If the cable sales price is old we set the value of status to ACTIVE else set to OLD
    if (findStatusProductSalesPrice.code === STATUS.OLD) {
      status = STATUS.ACTIVE;
    } else {
      status = STATUS.OLD;
    }

    if (!status) {
      throw new CustomException(
        'Status_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    //Find the real object of status
    const findStatus: Status = await this.prisma.status.findUnique({
      where: { code: status },
    });

    //We can update a cable sales price when we have a value of status
    await this.prisma.productSalesPrice.update({
      where: {
        uuid: salesPriceId,
      },
      data: {
        statusId: findStatus.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
