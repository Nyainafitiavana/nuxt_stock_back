import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateExpensesTypeDto } from './dto/create-expenses-type.dto';
import { UpdateExpensesTypeDto } from './dto/update-expenses-type.dto';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { ExpenseType, Prisma, Status } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { CustomException } from '../../utils/ExeptionCustom';

@Injectable()
export class ExpenseTypeService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(
    createExpensesTypeDto: CreateExpensesTypeDto,
  ): Promise<ExpenseType> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const createExpenseType: ExpenseType = await this.prisma.expenseType.create(
      {
        data: {
          ...createExpensesTypeDto,
          statusId: findStatusByCode.id,
          uuid: await this.helper.generateUuid(),
        },
      },
    );

    delete createExpenseType.id;
    return createExpenseType;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
  ): Promise<Paginate<ExpenseType[]>> {
    const query: Prisma.ExpenseTypeFindManyArgs = {
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
      this.prisma.expenseType.findMany(query),
      this.prisma.expenseType.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<ExpenseType> {
    const expenseType: ExpenseType = await this.prisma.expenseType.findUnique({
      where: {
        uuid: uuid,
      },
    });

    if (!expenseType) {
      throw new CustomException(
        'ExpenseType_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    return expenseType;
  }

  async update(
    uuid: string,
    updateExpensesTypeDto: UpdateExpensesTypeDto,
  ): Promise<ExecuteResponse> {
    const findExpenseType: ExpenseType = await this.findOne(uuid);
    const findStatusExpensesType: Status = await this.prisma.status.findUnique({
      where: { id: findExpenseType.statusId },
    });

    if (findStatusExpensesType.code === STATUS.DELETED) {
      throw new CustomException(
        "Can't update the already deleted expenses type",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    await this.prisma.expenseType.update({
      where: {
        uuid: findExpenseType.uuid,
      },
      data: {
        ...updateExpensesTypeDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findExpenseType: ExpenseType = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.expenseType.update({
      where: {
        uuid: findExpenseType.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
