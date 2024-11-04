import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';
import Helper from '../utils/helper';
import { MESSAGE, STATUS } from '../utils/constant';
import { CustomException } from '../utils/ExeptionCustom';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const createCategory: Category = await this.prisma.category.create({
      data: {
        ...createCategoryDto,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createCategory.id;
    return createCategory;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
  ): Promise<Paginate<Category[]>> {
    const query: Prisma.CategoryFindManyArgs = {
      where: {
        designation: {
          contains: keyword,
          mode: 'insensitive',
        },
        status: {
          code: status === STATUS.ACTIVE ? STATUS.ACTIVE : STATUS.DELETED,
        },
      },
      select: {
        designation: true,
        uuid: true,
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
      },
      orderBy: [{ designation: 'asc' }],
    };

    if (limit && page) {
      const offset: number = await this.helper.calculateOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.category.findMany(query),
      this.prisma.category.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<Category> {
    const category: Category = await this.prisma.category.findUnique({
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
      },
    });

    if (!category) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    return category;
  }

  async update(
    uuid: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ExecuteResponse> {
    const findCategory: Category = await this.findOne(uuid);

    await this.prisma.category.update({
      where: {
        uuid: findCategory.uuid,
      },
      data: {
        ...updateCategoryDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findCategory: Category = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.category.update({
      where: {
        uuid: findCategory.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
