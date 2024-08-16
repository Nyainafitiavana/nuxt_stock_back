import { HttpStatus, Injectable } from '@nestjs/common';
import { Category, Prisma, Product, Status, Unit } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { CustomException } from '../../utils/ExeptionCustom';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoryService } from '../category/category.service';
import { UnitService } from '../unit/unit.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
    private categoryService: CategoryService,
    private unitService: UnitService,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const findCategory: Category = await this.categoryService.findOne(
      createProductDto.idCategory,
    );

    const findUnit: Unit = await this.unitService.findOne(
      createProductDto.idUnit,
    );

    delete createProductDto.idCategory;
    delete createProductDto.idUnit;

    const createProduct: Product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        categoryId: findCategory.id,
        unitId: findUnit.id,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createProduct.id;
    delete createProduct.statusId;
    delete createProduct.categoryId;
    delete createProduct.unitId;
    return createProduct;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
    categoryId: string,
    unitId: string,
  ): Promise<Paginate<Product[]>> {
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

    // Add unit filter if unitId is not empty
    if (unitId !== '') {
      whereClause.unit = { uuid: unitId };
    }

    const query: Prisma.ProductFindManyArgs = {
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
        unit: {
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

    if (limit && page) {
      const offset: number = await this.helper.calculOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

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
    const findCategory: Category = await this.categoryService.findOne(
      updateProductDto.idCategory,
    );

    const findUnit: Unit = await this.unitService.findOne(
      updateProductDto.idUnit,
    );

    delete updateProductDto.idCategory;
    delete updateProductDto.idUnit;

    await this.prisma.product.update({
      where: {
        uuid: findProduct.uuid,
      },
      data: {
        ...updateProductDto,
        categoryId: findCategory.id,
        unitId: findUnit.id,
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
