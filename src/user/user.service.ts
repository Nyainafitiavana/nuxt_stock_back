import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Status, User } from '@prisma/client';
import { CustomException } from '../utils/ExeptionCustom';
import Helper from '../utils/helper';
import { MESSAGE, STATUS } from '../utils/constant';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const findUserEmail: User = await this.findOneByEmail(createUserDto.email);

    if (findUserEmail) {
      throw new CustomException(MESSAGE.EMAIL_FOUND, HttpStatus.CONFLICT);
    }

    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.ACTIVE },
    });

    const createUser: User = await this.prisma.user.create({
      data: {
        ...createUserDto,
        statusId: findStatusByCode.id,
        uuid: await this.helper.generateUuid(),
      },
    });

    delete createUser.id;
    delete createUser.password;
    return createUser;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    keyword: string,
    status: string,
  ): Promise<Paginate<User[]>> {
    const offset: number = await this.helper.calculateOffset(limit, page);

    const query: Prisma.UserFindManyArgs = {
      take: limit,
      skip: offset,
      where: {
        OR: [
          {
            firstName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: keyword,
              mode: 'insensitive',
            },
          },
          {
            phone: { contains: keyword },
          },
        ],
        status: {
          code: status === STATUS.ACTIVE ? STATUS.ACTIVE : STATUS.DELETED,
        },
      },
      select: {
        firstName: true,
        lastName: true,
        isAdmin: true,
        email: true,
        phone: true,
        uuid: true,
        status: {
          select: {
            designation: true,
            code: true,
            uuid: true,
          },
        },
      },
    };

    const [data, count] = await this.prisma.$transaction([
      this.prisma.user.findMany(query),
      this.prisma.user.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
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
  }

  async findOne(uuid: string): Promise<User> {
    const user: User = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new CustomException(MESSAGE.ID_NOT_FOUND, HttpStatus.CONFLICT);
    }

    delete user.id;
    delete user.password;
    delete user.statusId;
    return user;
  }

  async update(
    uuid: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ExecuteResponse> {
    const findUser: User = await this.findOne(uuid);

    await this.prisma.user.update({
      where: {
        uuid: findUser.uuid,
      },
      data: {
        ...updateUserDto,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }

  async remove(uuid: string): Promise<ExecuteResponse> {
    const findUser: User = await this.findOne(uuid);
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.DELETED },
    });

    await this.prisma.user.update({
      where: {
        uuid: findUser.uuid,
      },
      data: {
        statusId: findStatusByCode.id,
      },
    });

    return { message: MESSAGE.OK, statusCode: HttpStatus.OK };
  }
}
