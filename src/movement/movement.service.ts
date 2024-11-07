import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { RejectDto } from './dto/update-movement.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  HistoryValidation,
  Movement,
  Prisma,
  Product,
  ProductSalesPrice,
  Settings,
  Status,
  User,
} from '@prisma/client';
import {
  DetailsNotDelivered,
  DetailsWithStock,
  IInvoiceData,
  IInvoicePayload,
  MovementDetails,
} from './details.interface';
import { IHistoryValidation } from './historyValidation.interface';
import Helper from '../utils/helper';
import { MESSAGE, STATUS } from '../utils/constant';
import { CustomException } from '../utils/ExeptionCustom';
import { ExecuteResponse, Paginate } from '../utils/custom.interface';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class MovementService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
    private pdfService: PdfService,
  ) {}
  async create(
    createMovementDto: CreateMovementDto,
    userConnect: User,
  ): Promise<Movement> {
    //OUTSTANDING is the default status of new movement
    const findStatusByCode: Status = await this.prisma.status.findUnique({
      where: { code: STATUS.IN_PROGRESS },
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
    delete createNewMovement.statusId;

    return createNewMovement;
  }

  async createMovementDetailsService(
    details: MovementDetails[],
    movement: Movement,
  ): Promise<ExecuteResponse> {
    //Brows each item of details: MovementDetails[]
    for (const item of details) {
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
      await this.prisma.details.create({
        data: {
          uuid: await this.helper.generateUuid(),
          movementId: movement.id,
          productId: product.id,
          isUnitPrice: item.isUnitPrice,
          salesPriceId: productSalesPrice.id,
          quantity: item.quantity,
          quantityDelivered: item.quantityDelivered,
        },
      });
    }

    return { message: MESSAGE.OK, statusCode: 200 };
  }

  async findMovement(movementId: string): Promise<Movement> {
    const movement: Movement = await this.prisma.movement.findUnique({
      where: {
        uuid: movementId,
      },
    });

    if (!movement) {
      throw new CustomException(
        'Movement_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    return movement;
  }

  async findAll(
    limit: number = null,
    page: number = null,
    isSales: boolean,
    status: string,
    startDate: string,
    endDate: string,
  ): Promise<Paginate<Movement[]>> {
    const findStatus: Status = await this.prisma.status.findUnique({
      where: {
        code: status,
      },
    });

    if (!findStatus) {
      throw new CustomException(
        'Code status not found',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const whereClause: Prisma.MovementWhereInput = {
      statusId: findStatus.id,
      isSales: isSales,
    };

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

    const query: Prisma.MovementFindManyArgs = {
      where: whereClause,
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
        status: {
          select: {
            uuid: true,
            designation: true,
            code: true,
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
      this.prisma.movement.findMany(query),
      this.prisma.movement.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }

  async findAllDetailsMovement(
    movementId: string,
  ): Promise<DetailsWithStock[]> {
    const findMovement: Movement = await this.findMovement(movementId);

    return this.prisma.$queryRaw`
      SELECT 
        d.uuid AS detail_id,
        p."uuid" AS product_id,
        p.designation AS product_name,
        COALESCE(d.quantity, 0) AS quantity,
        COALESCE(d."quantityDelivered", 0) AS quantity_delivered,
        COALESCE(c."uuid", '---') AS category_id,
        COALESCE(c.designation, '---') AS category_name,
        COALESCE(u."uuid", '---') AS unit_id,
        COALESCE(u.designation, '---') AS unit_name,
        COALESCE(d."isUnitPrice", false) AS is_unit_price,
        COALESCE(psp."unitPrice", 0) AS unit_price,
        COALESCE(psp."wholesale", 0) AS wholesale_price,
        COALESCE(psp."purchasePrice", 0) AS purchase_price,
        COALESCE(psp."uuid", '') AS product_sales_price_id,
        COALESCE(
            (
                SELECT
                    COALESCE(
                      (
                         SUM(CASE 
                            WHEN m1."isSales" = false AND status_movement1.code = ${STATUS.VALIDATED} THEN d1.quantity 
                            ELSE 0 
                          END) - 
                         SUM(CASE 
                            WHEN m1."isSales" = true AND status_movement1.code = ${STATUS.COMPLETED} THEN d1.quantity 
                            ELSE 0
                         END)
                      )
                    ,0) AS remaining_stock
                FROM "Details" d1
                JOIN "Movement" m1 ON m1.id = d1."movementId"
                JOIN "Status" status_movement1 ON status_movement1.id = m1."statusId"
                WHERE d1."productId" = p.id
            ), 0) AS remaining_stock
    FROM "Details" d
    JOIN "Product" p ON p.id = d."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Unit" u ON u.id = p."unitId"
    LEFT JOIN "ProductSalesPrice" psp ON psp.id = d."salesPriceId"
    LEFT JOIN "Movement" m ON m.id = d."movementId"
    LEFT JOIN "Status" status_movement ON status_movement.id = m."statusId"
    WHERE d."movementId" = ${findMovement.id}
    ORDER BY p.designation ASC;
    `;
  }

  async findAllDetailsMovementNotDelivered(
    movementId: string,
  ): Promise<DetailsNotDelivered[]> {
    const findMovement: Movement = await this.findMovement(movementId);

    return this.prisma.$queryRaw`
      SELECT 
        d.uuid AS detail_id,
        p."uuid" AS product_id,
        p.designation AS product_name,
        COALESCE(d.quantity, 0) AS quantity,
        COALESCE(d."quantityDelivered", 0) AS quantity_delivered
    FROM "Details" d
    LEFT JOIN "Product" p ON p.id = d."productId"
    LEFT JOIN "Movement" m ON m.id = d."movementId"
    WHERE d."movementId" = ${findMovement.id}
    AND d."quantityDelivered" <> d.quantity 
    ORDER BY p.designation ASC;
    `;
  }

  async updateDetailMovement(
    movementId: string,
    details: MovementDetails[],
    userConnect: User,
  ): Promise<ExecuteResponse> {
    const findMovement: Movement = await this.findMovement(movementId);
    //Find status of movement to verify the privilege
    const findStatusMovement: Status = await this.prisma.status.findFirst({
      where: { id: findMovement.statusId },
    });

    if (
      findStatusMovement.code === STATUS.IN_PROGRESS &&
      !userConnect.isAdmin
    ) {
      throw new CustomException(
        "Can't update an already outstanding movement if you aren't an admin.",
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else if (
      findStatusMovement.code === STATUS.REJECTED &&
      userConnect.isAdmin
    ) {
      throw new CustomException(
        "Can't update an already rejected movement if you are an admin.",
        HttpStatus.NOT_ACCEPTABLE,
      );
    } else if (findStatusMovement.code === STATUS.COMPLETED) {
      throw new CustomException(
        "Can't update an already completed movement!",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    //Remove all old details before create a new details
    await this.removeDetailsMovement(findMovement.id);
    //Create new details
    await this.createMovementDetailsService(details, findMovement);

    const statusRejected = await this.prisma.status.findUnique({
      where: { code: STATUS.REJECTED },
    });

    //Update status movement to outstanding it's equal rejected after update
    if (findMovement.statusId === statusRejected.id) {
      const statusOutstanding = await this.prisma.status.findUnique({
        where: { code: STATUS.IN_PROGRESS },
      });

      await this.prisma.movement.update({
        where: { id: findMovement.id },
        data: { statusId: statusOutstanding.id },
      });
    }

    return {
      message: `Update details of movement ${movementId} with success.`,
      statusCode: 200,
    };
  }

  async generateInvoice(
    movementId: string,
    invoicePayloads: IInvoicePayload,
    userConnect: User,
  ): Promise<{ url: string }> {
    const findMovement: Movement = await this.findMovement(movementId);
    //Update details movement before the generating invoice
    /*
    await this.updateDetailMovement(
      movementId,
      invoicePayloads.details,
      userConnect,
    );

    //Check if each details is already delivered (Quantity - Quantity delivered = 0)
    //Then update movement status to COMPLETED
    const isAllDetailsDelivered: DetailsNotDelivered[] =
      await this.findAllDetailsMovementNotDelivered(movementId);
    //When we don't get any result we can update the movement status to COMPLETED
    if (!isAllDetailsDelivered) {
      const statusCompleted = await this.prisma.status.findUnique({
        where: { code: STATUS.COMPLETED },
      });

      await this.prisma.movement.update({
        where: { id: findMovement.id },
        data: { statusId: statusCompleted.id },
      });
    }*/

    //Init pdf
    return this.initPdf(
      findMovement.id,
      userConnect,
      invoicePayloads.invoiceData,
    );
  }

  async initPdf(
    movementId: number,
    userConnect: User,
    invoiceData: IInvoiceData,
  ): Promise<{ url: string }> {
    const appSetting: Settings = await this.prisma.settings.findFirst();

    const html = `
        <style>
          body {
              width: 80mm; /* Set width to match your PDF width */
              height: 200mm;
              font-family: Arial, "Roboto Light",serif;
              font-size: 12px;
              margin: 3px;
              padding: 0;
              overflow: hidden; /* Prevent overflow */
          }
          .head-invoice {
            font-size: 10px;
          }
          .separate {
              width: 30px;
          }
          .invoice-title {
              font-weight: 600;
          }
          .invoice-number {
              margin-left: 5px;
          }
          .company-name, .invoice-date {
              font-weight: 600;
          }
    
          .product-list-table {
              margin-top: 10px;
              width: 99%;
              font-size: 11px;
          }
    
          .product-list-table, .product-list-table th, .product-list-table td {
              border: 1px solid black;
              border-collapse: collapse;
          }
          .body-list {
            font-size: 9px;
          }
          .price {
              text-align: right;
          }
          .qt {
              text-align: center;
          }
          .total {
              margin-top: 5px;
              font-size: 10px;
          }
          .legend {
              margin-top: 5px;
              font-size: 9px;
          }
          
        </style>
        <body>
            <table>
              <tbody>
                <tr class="head-invoice">
                  <td class="company-name">${appSetting.companyName}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-title">${invoiceData.language === 'ENG' ? 'INVOICE' : 'FACTURE'}</span>
                    <span class="invoice-number">n°: F00005</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyAddress}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Date :</span>
                    <span class="invoice-number">${await this.helper.getDateNowString()}</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td>${appSetting.companyPhoneNumber}</td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">Client :</span>
                    <span class="invoice-number">Rakoto</span>
                  </td>
                </tr>
                <tr class="head-invoice">
                  <td></td>
                  <td class="separate"></td>
                  <td>
                    <span class="invoice-date">${invoiceData.language === 'ENG' ? 'Editor' : 'Editeur'} :</span>
                    <span class="invoice-number"> ${userConnect.lastName} ${userConnect.firstName}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="product-list-table">
              <thead class="head-invoice">
                <tr>
                  <th>${invoiceData.language === 'ENG' ? 'Designation' : 'Désignation'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'} ${appSetting.currencyType}</th>
                  <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.C'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}</th>
                  <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}</th>
                  <th>Total ${appSetting.currencyType}</th>
                </tr>
              </thead>
              <tbody class="body-list">
                ${invoiceData.details
                  .map(
                    (item: DetailsWithStock) => `
                      <tr>
                        <td>${item.product_name}</td>
                        <td class="price">${item.is_unit_price ? this.helper.formatPrice(item.unit_price) : this.helper.formatPrice(item.wholesale_price)}</td>
                        <td class="qt">${item.quantity}</td>
                        <td class="qt">${item.quantity_delivered}</td>
                        <td class="qt">${item.quantity - item.quantity_delivered}</td>
                        <td class="price">${item.is_unit_price ? this.helper.formatPrice(item.unit_price * item.quantity_delivered) : this.helper.formatPrice(item.wholesale_price * item.quantity_delivered)}</td>
                      </tr>
                    `,
                  )
                  .join('')}
              </tbody>
            </table>
            <table class="total">
              <tr>
                <th>Total : </th>
                <td>${this.helper.formatPrice(invoiceData.amountPaid)} ${appSetting.currencyType}</td>
              </tr>
            </table>
            <table class="legend">
              <tr >
                <th>${invoiceData.language === 'ENG' ? 'S.P' : 'P.V'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Sales price' : 'Prix de vente'} /</td>
                <th>${invoiceData.language === 'ENG' ? 'Qt.O' : 'Qt.D'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Quantity ordered' : 'Quantité commandée'} /</td>
                <th>${invoiceData.language === 'ENG' ? 'DLV' : 'LV'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Delivered' : 'Livré'} /</td>
                <th>${invoiceData.language === 'ENG' ? 'RM' : 'RTL'}: </th>
                <td>${invoiceData.language === 'ENG' ? 'Remaining' : 'Reste'}</td>
              </tr>
            </table>
        </body>
    `;

    return await this.pdfService.createPdfWithTable(html, 'TICKET');
  }

  async removeDetailsMovement(movementId: number): Promise<ExecuteResponse> {
    await this.prisma.details.deleteMany({
      where: { movementId: movementId },
    });

    return {
      message: `Deleted all details of movement ${movementId} with success.`,
      statusCode: 200,
    };
  }

  async validateMovement(
    movementId: string,
    user: User,
  ): Promise<ExecuteResponse> {
    const statusValidated: Status = await this.prisma.status.findUnique({
      where: {
        code: STATUS.VALIDATED,
      },
    });

    //Find movement
    const findMovement: Movement = await this.findMovement(movementId);

    const findStatusMovement: Status = await this.prisma.status.findFirst({
      where: { id: findMovement.statusId },
    });

    if (findStatusMovement.code === STATUS.REJECTED) {
      throw new CustomException(
        "Can't validate an already rejected movement",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    //Create history validation
    const insertNewHistoryValidation: HistoryValidation =
      await this.prisma.historyValidation.create({
        data: {
          movementId: findMovement.id,
          validatorId: user.id,
          statusId: statusValidated.id,
          uuid: await this.helper.generateUuid(),
        },
      });

    if (!insertNewHistoryValidation) {
      throw new CustomException(
        'An error occurs during validation',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    //update movement status
    await this.prisma.movement.update({
      where: { uuid: movementId },
      data: {
        statusId: statusValidated.id,
      },
    });

    return {
      message: `Validate movement ${movementId} with success.`,
      statusCode: 200,
    };
  }

  async rejectMovement(
    movementId: string,
    user: User,
    rejectDto: RejectDto,
  ): Promise<ExecuteResponse> {
    //Reject observation is required
    if (rejectDto.observation === '') {
      throw new CustomException(
        'Reject observation is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const statusRejected: Status = await this.prisma.status.findUnique({
      where: {
        code: STATUS.REJECTED,
      },
    });

    //Find movement
    const findMovement: Movement = await this.findMovement(movementId);

    const findStatusMovement: Status = await this.prisma.status.findFirst({
      where: { id: findMovement.statusId },
    });

    if (
      findStatusMovement.code === STATUS.COMPLETED ||
      findStatusMovement.code === STATUS.VALIDATED
    ) {
      throw new CustomException(
        "Can't reject an already validated or completed movement",
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    //Create history validation
    const insertNewHistoryValidation: HistoryValidation =
      await this.prisma.historyValidation.create({
        data: {
          movementId: findMovement.id,
          validatorId: user.id,
          statusId: statusRejected.id,
          uuid: await this.helper.generateUuid(),
          observation: rejectDto.observation,
        },
      });

    if (!insertNewHistoryValidation) {
      throw new CustomException(
        'An error occurs during reject',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    //Update Status of movement
    await this.prisma.movement.update({
      where: { uuid: movementId },
      data: {
        statusId: statusRejected.id,
      },
    });

    return {
      message: `Rejected of movement ${movementId} with success.`,
      statusCode: 200,
    };
  }

  async findAllHistoryValidationMovement(
    movementId: string,
  ): Promise<IHistoryValidation[]> {
    const findMovement: Movement = await this.findMovement(movementId);

    return this.prisma.historyValidation.findMany({
      where: { movementId: findMovement.id },
      select: {
        uuid: true,
        createdAt: true,
        observation: true,
        validator: {
          select: {
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
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }
}
