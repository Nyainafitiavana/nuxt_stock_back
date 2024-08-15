import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { Prisma, Status, Unit } from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { CustomException } from '../../utils/ExeptionCustom';

@Injectable()
export class UnitService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const createUnit: Unit = await this.prisma.unit.create({
      data: {
        ...createUnitDto,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createUnit.id;
    return createUnit;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
  ): Promise<Paginate<Unit[]>> {
    const query: Prisma.UnitFindManyArgs = {
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
      this.prisma.unit.findMany(query),
      this.prisma.unit.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOne(uuid: string): Promise<Unit> {
    const unit: Unit = await this.prisma.unit.findUnique({
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

    if (!unit) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    return unit;
  }

  async update(
    uuid: string,
    updateUnitDto: UpdateUnitDto,
  ): Promise<ExecuteResponse> {
    const findUnit: Unit = await this.findOne(uuid);

    await this.prisma.unit.update({
      where: {
        uuid: findUnit.uuid,
      },
      data: {
        ...updateUnitDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findUnit: Unit = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.unit.update({
      where: {
        uuid: findUnit.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
