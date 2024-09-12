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
            wholesale: true,
            unitPrice: true,
            purchasePrice: true,
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

  async getProductRemainingStock(
    limit: number = null,
    page: number = null,
    keyword: string = null,
    startDate: string = null,
    endDate: string = null,
    categoryId: string = null,
    unitId: string = null,
  ): Promise<{ data: any; count: number }> {
    let startToDate: string | null = null;
    let endToDate: string | null = null;

    if (startDate && endDate) {
      startToDate = new Date(startDate).toISOString(); // Format to ISO string
      const dateObject = new Date(endDate);
      dateObject.setHours(23, 59, 59, 999);
      endToDate = dateObject.toISOString(); // Format to ISO string
    }

    // Base query without pagination
    let baseQuery = `
          SELECT
            p."uuid" AS product_id,
            p.designation AS product_name,
            COALESCE(c."uuid", '---') AS category_id,
            COALESCE(c.designation, '---') AS category_name,
            COALESCE(u."uuid", '---') AS unit_id,
            COALESCE(u.designation, '---') AS unit_name,
            COALESCE(
              SUM(CASE 
                  WHEN m."isSales" = false AND status_movement.code = '${STATUS.VALIDATED}' 
                       ${startToDate ? `AND m."createdAt" >= '${startToDate}'` : ''}
                       ${endToDate ? `AND m."createdAt" <= '${endToDate}'` : ''} THEN d.quantity 
                  ELSE 0 
              END)
            , 0) AS stock_input,
            COALESCE(
              SUM(CASE 
                  WHEN m."isSales" = true AND status_movement.code = '${STATUS.COMPLETED}' 
                       ${startToDate ? `AND m."createdAt" >= '${startToDate}'` : ''}
                       ${endToDate ? `AND m."createdAt" <= '${endToDate}'` : ''} THEN d.quantity 
                  ELSE 0 
              END)
            , 0) AS stock_output,
            COALESCE(
                (
                    SUM(CASE 
                        WHEN m."isSales" = false AND status_movement.code = '${STATUS.VALIDATED}' 
                             ${startToDate ? `AND m."createdAt" >= '${startToDate}'` : ''}
                             ${endToDate ? `AND m."createdAt" <= '${endToDate}'` : ''} THEN d.quantity 
                        ELSE 0 
                    END) - 
                    SUM(CASE 
                        WHEN m."isSales" = true AND status_movement.code = '${STATUS.COMPLETED}' 
                             ${startToDate ? `AND m."createdAt" >= '${startToDate}'` : ''}
                             ${endToDate ? `AND m."createdAt" <= '${endToDate}'` : ''} THEN d.quantity 
                        ELSE 0 
                    END)
              ), 0) AS remaining_stock,
            COALESCE(psp."uuid", '') AS product_sales_price_id,
            COALESCE(psp."unitPrice", 0) AS unit_price,
            COALESCE(psp."wholesale", 0) AS wholesale_price,
            COALESCE(psp."purchasePrice", 0) AS purchase_price
      FROM "Product" p 
      LEFT JOIN "Status" status_product ON status_product.id = p."statusId" 
      LEFT JOIN "Category" c ON c.id = p."categoryId" 
      LEFT JOIN "Unit" u ON u.id = p."unitId" 
      LEFT JOIN "Details" d ON d."productId" = p.id 
      LEFT JOIN "Movement" m ON m.id = d."movementId" 
      LEFT JOIN "Status" status_movement ON status_movement.id = m."statusId" 
      LEFT JOIN (
          SELECT DISTINCT ON (psp_inner."productId") 
              psp_inner."productId",
              psp_inner."uuid",
              psp_inner."unitPrice",
              psp_inner."wholesale",
              psp_inner."purchasePrice"
          FROM "ProductSalesPrice" psp_inner
          LEFT JOIN "Status" status_sales_price_inner ON status_sales_price_inner.id = psp_inner."statusId"
          WHERE status_sales_price_inner.code = '${STATUS.ACTIVE}'
          ORDER BY psp_inner."productId", psp_inner."createdAt" DESC
      ) psp ON psp."productId" = p.id 
      WHERE status_product.code = '${STATUS.ACTIVE}'
    `;

    // Adding the keyword condition
    if (keyword && keyword.trim() !== '') {
      baseQuery += ` AND LOWER(p.designation) LIKE LOWER('%${keyword}%')`;
    }

    // Adding the category condition
    if (categoryId) {
      const findCategory: Category =
        await this.categoryService.findOne(categoryId);
      baseQuery += ` AND c.id = ${findCategory.id}`;
    }

    // Adding the unit condition
    if (unitId) {
      const findUnit: Unit = await this.unitService.findOne(unitId);
      baseQuery += ` AND u.id = ${findUnit.id}`;
    }

    // Grouping and ordering
    const groupByClause = `
    GROUP BY p."uuid", p.designation, c."uuid", c.designation, u."uuid", u.designation, psp."uuid", psp."unitPrice", psp."wholesale", psp."purchasePrice"
    ORDER BY p.designation ASC
  `;

    // Pagination logic
    let paginatedQuery = baseQuery + groupByClause;
    if (limit && page) {
      const offset = (page - 1) * limit;
      paginatedQuery += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    // Calculate count without pagination
    const countQuery =
      baseQuery +
      `
    GROUP BY p."uuid", p.designation, c."uuid", c.designation, u."uuid", u.designation, psp."uuid", psp."unitPrice", psp."wholesale", psp."purchasePrice"
    ORDER BY p.designation ASC
  `;

    try {
      const data = await this.prisma.$queryRawUnsafe(paginatedQuery);
      const countResult = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM (${countQuery}) AS count_query`,
      );
      const count = Number(countResult[0].count);

      return { data, count };
    } catch (error) {
      console.error('Error executing query:', error);
      throw new Error('Database query failed');
    }
  }
}
