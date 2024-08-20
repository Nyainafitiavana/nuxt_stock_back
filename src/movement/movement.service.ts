import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import {
  Details,
  Movement,
  Prisma,
  Product,
  ProductSalesPrice,
  Status,
  User,
} from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse, Paginate } from '../../utils/custom.interface';
import { MovementDetails } from './details.interface';
import { CustomException } from '../../utils/ExeptionCustom';

@Injectable()
export class MovementService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}
  async create(
    createMovementDto: CreateMovementDto,
    userConnect: User,
  ): Promise<Movement> {
    //OUTSTANDING is the default status of new movement
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.OUTSTANDING },
    });
    //Find User connect
    const connectUser: User = await this.prisma.user.findUnique({
      where: { uuid: userConnect.uuid },
    });

    //Create new movement
    const createNewMovement: Movement = await this.prisma.movement.create({
      data: {
        uuid: await this.helper.generateUuid(),
        editorId: connectUser.id,
        isSales: createMovementDto.isSales,
        statusId: findStatusByCode.id,
      },
    });

    if (!createNewMovement) {
      throw new CustomException(
        MESSAGE.ID_NOT_FOUND + 'during the creation of the new Movement',
        HttpStatus.CONFLICT,
      );
    }

    //Create all movement details
    await this.createMovementDetailsService(
      createMovementDto.details,
      createNewMovement,
    );

    delete createNewMovement.editorId;
    delete createNewMovement.validatorId;
    delete createNewMovement.statusId;

    return createNewMovement;
  }

  async createMovementDetailsService(
    details: MovementDetails[],
    movement: Movement,
  ): Promise<ExecuteResponse> {
    //Brows each item of details: MovementDetails[]
    details.map(async (item: MovementDetails) => {
      //findProduct
      const product: Product = await this.prisma.product.findUnique({
        where: {
          uuid: item.idProduct,
        },
      });

      if (!product) {
        throw new CustomException(
          'Product_' + MESSAGE.ID_NOT_FOUND,
          HttpStatus.CONFLICT,
        );
      }

      //OUTSTANDING is the default status of new movement
      const findActiveStatusByCode: Status = await this.prisma.status.findFirst(
        {
          where: { code: STATUS.ACTIVE },
        },
      );
      //Find current product sales price
      const productSalesPrice: ProductSalesPrice =
        await this.prisma.productSalesPrice.findFirst({
          where: {
            productId: product.id,
            statusId: findActiveStatusByCode.id,
          },
        });

      if (!productSalesPrice) {
        throw new CustomException(
          'Impossible to create a detail with the missing sales price of the product',
          HttpStatus.CONFLICT,
        );
      }
      //Create new detail movement
      const createDetail: Details = await this.prisma.details.create({
        data: {
          uuid: await this.helper.generateUuid(),
          movementId: movement.id,
          productId: product.id,
          isUnitPrice: item.isUnitPrice,
          salesPriceId: productSalesPrice.id,
          quantity: item.quantity,
        },
      });

      if (!createDetail) {
        throw new CustomException(
          MESSAGE.ID_NOT_FOUND + 'during the creation of details movement',
          HttpStatus.CONFLICT,
        );
      }
    });

    return { message: MESSAGE.OK, statusCode: 200 };
  }

  async findAll(
    limit: number = null,
    page: number = null,
    isSales: boolean,
    status: string,
  ): Promise<Paginate<Movement[]>> {
    const query: Prisma.MovementFindManyArgs = {
      where: {
        status: {
          code:
            status === STATUS.OUTSTANDING
              ? STATUS.OUTSTANDING
              : status === STATUS.COMPLETED
                ? STATUS.COMPLETED
                : STATUS.DELETED,
        },
        isSales: isSales,
      },
      select: {
        createdAt: true,
        updatedAt: true,
        isSales: true,
        uuid: true,
        editor: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
          },
        },
        validator: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
          },
        },
        status: {
          select: {
            uuid: true,
            designation: true,
            code: true,
          },
        },
        details: {
          select: {
            uuid: true,
            isUnitPrice: true,
            product: {
              select: {
                uuid: true,
                designation: true,
                description: true,
                unit: {
                  select: {
                    uuid: true,
                    designation: true,
                  },
                },
                category: {
                  select: {
                    uuid: true,
                    designation: true,
                  },
                },
              },
            },
            salesPrice: {
              select: {
                uuid: true,
                unitPrice: true,
                wholesale: true,
                purchasePrice: true,
                status: {
                  select: {
                    uuid: true,
                    designation: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    };

    if (limit && page) {
      const offset: number = await this.helper.calculOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.movement.findMany(query),
      this.prisma.movement.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findAllDetailsMovement(
    limit: number = null,
    page: number = null,
    movementId: string,
  ): Promise<Paginate<Details[]>> {
    const query: Prisma.DetailsFindManyArgs = {
      where: {
        movement: {
          uuid: movementId,
        },
      },
      select: {
        uuid: true,
        product: {
          select: {
            uuid: true,
            designation: true,
            description: true,
          },
        },
        isUnitPrice: true,
        salesPrice: {
          select: {
            uuid: true,
            unitPrice: true,
            wholesale: true,
            purchasePrice: true,
          },
        },
      },
      orderBy: [{ product: { designation: 'asc' } }],
    };

    if (limit && page) {
      const offset: number = await this.helper.calculOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.details.findMany(query),
      this.prisma.details.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  findOne(id: number) {
    return `This action returns a #${id} movement`;
  }

  update(id: number, updateMovementDto: UpdateMovementDto) {
    return `This action updates a #${id} movement`;
  }

  remove(id: number) {
    return `This action removes a #${id} movement`;
  }
}
