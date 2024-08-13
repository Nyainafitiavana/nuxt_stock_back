import { HttpStatus, Injectable } from '@nestjs/common';
import { Category, Prisma, Product, Status } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { CustomException } from '../../utils/ExeptionCustom';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const findCategory: Category = await this.prisma.category.findUnique({
      where: { uuid: createProductDto.idCategory },
    });

    if (!findCategory) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    delete createProductDto.idCategory;

    const createProduct: Product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        categoryId: findCategory.id,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createProduct.id;
    delete createProduct.statusId;
    delete createProduct.categoryId;
    return createProduct;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
    categoryId: string,
  ): Promise<Paginate<Product[]>> {
    const offset: number = await this.helper.calculOffset(limit, page);

    // Initialize the where clause
    const whereClause: Prisma.ProductWhereInput = {
      designation: { contains: keyword, mode: 'insensitive' },
      status: {
        code: status === STATUS.ACTIVE ? STATUS.ACTIVE : STATUS.DELETED,
      },
    };

    // Add category filter if categoryId is not empty
    if (categoryId !== '') {
      whereClause.category = { uuid: categoryId };
    }

    const query: Prisma.ProductFindManyArgs = {
      take: limit,
      skip: offset,
      where: whereClause,
      select: {
        designation: true,
        uuid: true,
        description: true,
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
        category: {
          select: {
            designation: true,
            uuid: true,
          },
        },
        productSalesPrice: {
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
        },
      },
    };

    const [data, count] = await this.prisma.$transaction([
      this.prisma.product.findMany(query),
      this.prisma.product.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<Product> {
    const product: Product = await this.prisma.product.findUnique({
      where: {
        uuid: uuid,
      },
      include: {
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
        category: {
          select: {
            designation: true,
            uuid: true,
          },
        },
      },
    });

    if (!product) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    delete product.statusId;
    delete product.categoryId;
    return product;
  }

  async update(
    uuid: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ExecuteResponse> {
    const findProduct: Product = await this.findOne(uuid);
    const findCategory: Category = await this.prisma.category.findUnique({
      where: { uuid: updateProductDto.idCategory },
    });

    delete updateProductDto.idCategory;

    await this.prisma.product.update({
      where: {
        uuid: findProduct.uuid,
      },
      data: {
        ...updateProductDto,
        categoryId: findCategory.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findProduct: Product = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.product.update({
      where: {
        uuid: findProduct.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
