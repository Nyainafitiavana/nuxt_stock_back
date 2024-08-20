import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { PrismaService } from '../prisma/prisma.service';
import Helper from '../../utils/helper';
import { CreateCategoryDto } from '../category/dto/create-category.dto';
import {
  Category,
  Details,
  Movement,
  Product,
  Status,
  User,
} from '@prisma/client';
import { MESSAGE, STATUS } from '../../utils/constant';
import { ExecuteResponse } from '../../utils/custom.interface';
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
      //Create new detail movement
      const createDetail: Details = await this.prisma.details.create({
        data: {
          uuid: await this.helper.generateUuid(),
          movementId: movement.id,
          productId: product.id,
          isUnitPrice: item.isUnitPrice,
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

  findAll() {
    return `This action returns all movement`;
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
