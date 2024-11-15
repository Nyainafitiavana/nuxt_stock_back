import {
  Controller,
  Get,
  HttpStatus,
  Next,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PdfService } from './pdf.service';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { Paginate } from '../utils/custom.interface';
import { AuthGuard } from '../auth/auth.guards';
import { Invoice } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guards';

@Controller('/api/invoice')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('/pdf/:name')
  getPdf(@Res() res: Response, @Param('name') pdfName: string) {
    res.sendFile(join(__dirname, '..', '..', '..', 'public', pdfName));
  }

  @UseGuards(AuthGuard)
  @Get('/movement/:uuid')
  async getInvoiceByMovement(
    @Res() res: Response,
    @Param('uuid') movementId: string,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const invoice: Paginate<Invoice[]> =
        await this.pdfService.findByMovementInvoice(movementId);

      res.status(HttpStatus.OK).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Res() res: Response,
    @Next() next: NextFunction,
    @Req() req: Request,
  ): Promise<void> {
    try {
      const reference: string = req.query.reference
        ? (req.query.reference as string)
        : '';
      const limit: number = req.query.limit ? Number(req.query.limit) : null;
      const page: number = req.query.page ? Number(req.query.page) : null;
      const startDate: string = req.query.startDate
        ? String(req.query.startDate)
        : '';
      const endDate: string = req.query.endDate
        ? String(req.query.endDate)
        : '';

      const invoice: Paginate<Invoice[]> = await this.pdfService.findAllInvoice(
        reference,
        startDate,
        endDate,
        limit,
        page,
      );

      res.status(HttpStatus.OK).json(invoice);
    } catch (error) {
      next(error);
    }
  }
}
