import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Expenses, ExpenseType, Prisma, Status } from '@prisma/client';
import { ExpenseTypeService } from '../expense-type/expense-type.service';
import { MESSAGE, STATUS } from '../utils/constant';
import Helper from '../utils/helper';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';
import { CustomException } from '../utils/ExeptionCustom';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
    private expenseTypeService: ExpenseTypeService,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expenses> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const findExpenseType: ExpenseType = await this.expenseTypeService.findOne(
      createExpenseDto.idExpenseType,
    );

    delete createExpenseDto.idExpenseType;

    const createExpenses: Expenses = await this.prisma.expenses.create({
      data: {
        ...createExpenseDto,
        expenseTypeId: findExpenseType.id,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createExpenses.id;
    return createExpenses;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    expenseTypeId: string = null,
    status: string,
    startDate: string,
    endDate: string,
  ): Promise<Paginate<Expenses[]>> {
    // Initialize the where clause
    const whereClause: Prisma.ExpensesWhereInput = {
      status: {
        code: status === STATUS.ACTIVE ? STATUS.ACTIVE : STATUS.DELETED,
      },
    };

    if (expenseTypeId) {
      whereClause.expenseType = { uuid: expenseTypeId };
    }

    if (startDate !== '' && endDate !== '') {
      const startToDate: Date = new Date(startDate);
      //We need to set hours to 23h 59min 59sc 999ms to be sure so all movement created in the endDate is included
      const endToDate: Date = new Date(
        new Date(endDate).setHours(23, 59, 59, 999),
      );
      //gte: Greater than or equal to.
      //lte: Less than or equal to.
      whereClause.createdAt = {
        gte: startToDate,
        lte: endToDate,
      };
    }

    const query: Prisma.ExpensesFindManyArgs = {
      where: whereClause,
      select: {
        uuid: true,
        description: true,
        expenseType: {
          select: {
            designation: true,
            uuid: true,
          },
        },
        amount: true,
        createdAt: true,
        updatedAt: true,
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    };

    if (limit && page) {
      const offset: number = await this.helper.calculateOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.expenses.findMany(query),
      this.prisma.expenses.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<Expenses> {
    const expenses: Expenses = await this.prisma.expenses.findUnique({
      where: {
        uuid: uuid,
      },
    });

    if (!expenses) {
      throw new CustomException(
        'Expenses_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    return expenses;
  }

  async update(
    uuid: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<ExecuteResponse> {
    const findExpenses: Expenses = await this.findOne(uuid);
    const findStatusExpense: Status = await this.prisma.status.findUnique({
      where: { id: findExpenses.statusId },
    });

    if (findStatusExpense.code === STATUS.DELETED) {
      throw new CustomException(
        "Can't update the already deleted expenses type",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const findExpenseType: ExpenseType = await this.expenseTypeService.findOne(
      updateExpenseDto.idExpenseType,
    );

    delete updateExpenseDto.idExpenseType;

    await this.prisma.expenses.update({
      where: {
        id: findExpenses.id,
      },
      data: {
        ...updateExpenseDto,
        expenseTypeId: findExpenseType.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findExpenses: Expenses = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.expenses.update({
      where: {
        id: findExpenses.id,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
