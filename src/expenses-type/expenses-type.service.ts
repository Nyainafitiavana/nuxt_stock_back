import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateExpensesTypeDto } from './dto/create-expenses-type.dto';
import { UpdateExpensesTypeDto } from './dto/update-expenses-type.dto';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ExpensesType, Prisma, Status } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { CustomException } from '../../utils/ExeptionCustom';

@Injectable()
export class ExpensesTypeService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(
    createExpensesTypeDto: CreateExpensesTypeDto,
  ): Promise<ExpensesType> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const createExpensesType: ExpensesType =
      await this.prisma.expensesType.create({
        data: {
          ...createExpensesTypeDto,
          statusId: findStatusByCode.id,
          uuid: await this.helper.generateUuid(),
        },
      });

    delete createExpensesType.id;
    return createExpensesType;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
  ): Promise<Paginate<ExpensesType[]>> {
    const query: Prisma.ExpensesTypeFindManyArgs = {
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
      const offset: number = await this.helper.calculOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.expensesType.findMany(query),
      this.prisma.expensesType.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<ExpensesType> {
    const expensesType: ExpensesType =
      await this.prisma.expensesType.findUnique({
        where: {
          uuid: uuid,
        },
      });

    if (!expensesType) {
      throw new CustomException(
        'ExpensesType_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    return expensesType;
  }

  async update(
    uuid: string,
    updateExpensesTypeDto: UpdateExpensesTypeDto,
  ): Promise<ExecuteResponse> {
    const findExpensesType: ExpensesType = await this.findOne(uuid);
    const findStatusExpensesType: Status = await this.prisma.status.findUnique({
      where: { id: findExpensesType.statusId },
    });

    if (findStatusExpensesType.code === STATUS.DELETED) {
      throw new CustomException(
        "Can't update the already deleted expenses type",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    await this.prisma.expensesType.update({
      where: {
        uuid: findExpensesType.uuid,
      },
      data: {
        ...updateExpensesTypeDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findExpensesType: ExpensesType = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.expensesType.update({
      where: {
        uuid: findExpensesType.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
