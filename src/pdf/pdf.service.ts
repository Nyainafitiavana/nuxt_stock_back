import { HttpStatus, Injectable } from '@nestjs/common';
import * as path from 'path';
import puppeteer, { PDFOptions } from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceData } from './invoice.interface';
import Helper from '../utils/helper';
import { Paginate } from '../utils/custom.interface';
import { Invoice, Movement, Prisma } from '@prisma/client';
import { CustomException } from '../utils/ExeptionCustom';
import { MESSAGE } from '../utils/constant';

@Injectable()
export class PdfService {
  constructor(
    private prisma: PrismaService,
    private helper: Helper,
  ) {}

  async createPdfWithTable(
    htmlContent: string,
    format: 'A4' | 'TICKET',
    fileName: string,
  ): Promise<{ url: string }> {
    // Define the path to the PDF file in the public directory
    const pdfPath = path.join(process.cwd(), 'public', `${fileName}`);

    // Define PDF options based on format
    const options: PDFOptions = {
      path: pdfPath,
      printBackground: true,
    };

    // Set custom dimensions for TICKET format
    if (format === 'TICKET') {
      // Use specific dimensions for ticket format
      options.width = '80mm'; // Width of 80mm
      options.height = '200mm'; // Height of 200mm
      options.margin = {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      }; // Set margins to 0 if needed
    } else if (format === 'A4') {
      options.format = 'A4'; // Keep A4 for A4 format
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // Set the viewport to ensure proper rendering
    await page.setViewport({ width: 800, height: 2000 });

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf(options);

    await browser.close();

    return {
      url: `/api/pdf/${fileName}`,
    };
  }

  async generateNextInvoiceRef(language: string): Promise<string> {
    // Set prefix based on language
    const prefix = language === 'ENG' ? 'INV' : 'FACT';

    // Fetch the highest reference with the current prefix in the invoices table
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        reference: {
          startsWith: prefix, // Only get references starting with the correct prefix
        },
      },
      orderBy: {
        reference: 'desc',
      },
    });

    // Initialize the next reference
    let nextRef = `${prefix}-001`;
    if (lastInvoice) {
      // Extract the numeric part of the reference (e.g., "009" from "INV-009")
      const lastRefNumber = parseInt(lastInvoice.reference.split('-')[1], 10);

      // Increment the number and format with leading zeros
      const newRefNumber = (lastRefNumber + 1).toString().padStart(3, '0');
      nextRef = `${prefix}-${newRefNumber}`;
    }

    return nextRef;
  }

  async createInvoice(data: InvoiceData, language: string): Promise<string> {
    const nextRef = await this.generateNextInvoiceRef(language);

    await this.prisma.invoice.create({
      data: {
        reference: nextRef,
        uuid: await this.helper.generateUuid(),
        ...data,
        fileName: `${nextRef}.pdf`,
      },
    });

    return nextRef;
  }

  async findAllInvoice(
    limit: number = null,
    page: number = null,
    movementId: string,
  ): Promise<Paginate<Invoice[]>> {
    const findMovement: Movement = await this.prisma.movement.findUnique({
      where: { uuid: movementId },
    });

    if (!findMovement) {
      throw new CustomException(
        'Movement_' + MESSAGE.ID_NOT_FOUND,
        HttpStatus.CONFLICT,
      );
    }

    const query: Prisma.InvoiceFindManyArgs = {
      where: {
        movementId: findMovement.id,
      },
      select: {
        uuid: true,
        reference: true,
        clientName: true,
        editor: {
          select: {
            uuid: true,
            lastName: true,
            firstName: true,
          },
        },
        createdAt: true,
        fileName: true,
      },
      orderBy: [{ reference: 'desc' }],
    };

    if (limit && page) {
      const offset: number = await this.helper.calculateOffset(limit, page);
      query.take = limit;
      query.skip = offset;
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.invoice.findMany(query),
      this.prisma.invoice.count({ where: query.where }),
    ]);

    return { data: data, totalRows: count, page: page };
  }
}
